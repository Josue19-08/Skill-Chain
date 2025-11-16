#![cfg_attr(not(feature = "std"), no_std, no_main)]
#![allow(unexpected_cfgs)]
#![allow(clippy::cast_possible_truncation)]
#![allow(clippy::arithmetic_side_effects)]

#[ink::contract]
mod escrow {
    use ink::storage::Mapping;
    use ink::prelude::{string::String, vec::Vec};

    // ========================================
    // TYPES MODULE
    // ========================================

    /// Status of an escrow
    #[derive(Debug, Clone, PartialEq, Eq, scale::Encode, scale::Decode)]
    #[cfg_attr(feature = "std", derive(scale_info::TypeInfo, ink::storage::traits::StorageLayout))]
    pub enum EscrowStatus {
        /// Escrow created, waiting for funds
        Created,
        /// Funds deposited, work in progress
        Funded,
        /// All milestones completed
        Completed,
        /// Cancelled by mutual agreement or arbiter
        Cancelled,
        /// In dispute, waiting for arbitration
        Disputed,
    }

    /// Represents a milestone in an escrow
    #[derive(Debug, Clone, scale::Encode, scale::Decode)]
    #[cfg_attr(feature = "std", derive(scale_info::TypeInfo, ink::storage::traits::StorageLayout))]
    pub struct Milestone {
        /// Unique identifier for the milestone within the escrow
        pub id: u32,
        /// Amount to be paid for this milestone
        pub amount: Balance,
        /// Whether this milestone has been released
        pub released: bool,
        /// Description or URI pointing to off-chain milestone details
        pub description: String,
    }

    /// Represents an escrow agreement
    #[derive(Debug, Clone, scale::Encode, scale::Decode)]
    #[cfg_attr(feature = "std", derive(scale_info::TypeInfo, ink::storage::traits::StorageLayout))]
    pub struct Escrow {
        /// Unique identifier for the escrow
        pub id: u64,
        /// Account of the client (payer)
        pub client: AccountId,
        /// Account of the freelancer (payee)
        pub freelancer: AccountId,
        /// Optional arbiter account for dispute resolution
        pub arbiter: Option<AccountId>,
        /// Total amount of the escrow (sum of all milestones)
        pub total_amount: Balance,
        /// Amount currently deposited in the escrow
        pub deposited: Balance,
        /// List of milestones for this escrow
        pub milestones: Vec<Milestone>,
        /// Current status of the escrow
        pub status: EscrowStatus,
        /// Account that requested cancellation (if any)
        pub cancel_requested_by: Option<AccountId>,
        /// Timestamp when escrow was created
        pub created_at: u64,
    }

    // ========================================
    // ERRORS MODULE
    // ========================================

    /// Error types for the Escrow contract
    #[derive(Debug, PartialEq, Eq, scale::Encode, scale::Decode)]
    #[cfg_attr(feature = "std", derive(scale_info::TypeInfo))]
    pub enum EscrowError {
        /// Escrow not found with the specified ID
        EscrowNotFound,
        /// Caller is not authorized for this operation
        Unauthorized,
        /// Escrow is in an invalid status for this operation
        InvalidStatus,
        /// Insufficient funds for this operation
        InsufficientFunds,
        /// Milestone not found with the specified ID
        MilestoneNotFound,
        /// Milestone has already been released
        MilestoneAlreadyReleased,
        /// Invalid arbiter account
        InvalidArbiter,
        /// Invalid amount distribution (sum doesn't match total)
        InvalidAmount,
        /// Cannot create escrow with empty milestones
        EmptyMilestones,
        /// Cannot create escrow with zero amount
        ZeroAmount,
    }

    /// Result type for contract operations
    pub type Result<T> = core::result::Result<T, EscrowError>;

    // ========================================
    // EVENTS MODULE
    // ========================================

    /// Emitted when a new escrow is created
    #[ink(event)]
    pub struct EscrowCreated {
        #[ink(topic)]
        pub escrow_id: u64,
        #[ink(topic)]
        pub client: AccountId,
        #[ink(topic)]
        pub freelancer: AccountId,
        pub arbiter: Option<AccountId>,
        pub total_amount: Balance,
    }

    /// Emitted when funds are deposited into an escrow
    #[ink(event)]
    pub struct EscrowFunded {
        #[ink(topic)]
        pub escrow_id: u64,
        pub amount: Balance,
    }

    /// Emitted when a milestone is released
    #[ink(event)]
    pub struct MilestoneReleased {
        #[ink(topic)]
        pub escrow_id: u64,
        pub milestone_id: u32,
        pub amount: Balance,
    }

    /// Emitted when cancellation is requested
    #[ink(event)]
    pub struct CancelRequested {
        #[ink(topic)]
        pub escrow_id: u64,
        #[ink(topic)]
        pub requested_by: AccountId,
    }

    /// Emitted when an escrow is cancelled
    #[ink(event)]
    pub struct EscrowCancelled {
        #[ink(topic)]
        pub escrow_id: u64,
        pub refund_to_client: Balance,
        pub refund_to_freelancer: Balance,
    }

    /// Emitted when a dispute is resolved by an arbiter
    #[ink(event)]
    pub struct DisputeResolved {
        #[ink(topic)]
        pub escrow_id: u64,
        pub freelancer_share: Balance,
        pub client_refund: Balance,
    }

    // ========================================
    // STORAGE MODULE
    // ========================================

    /// Main storage structure for the Escrow contract
    #[ink(storage)]
    pub struct EscrowMultiRelease {
        /// Mapping from escrow ID to Escrow
        escrows: Mapping<u64, Escrow>,
        /// Counter for the next escrow ID
        next_escrow_id: u64,
        /// Mapping from client AccountId to their escrow IDs
        client_escrows: Mapping<AccountId, Vec<u64>>,
        /// Mapping from freelancer AccountId to their escrow IDs
        freelancer_escrows: Mapping<AccountId, Vec<u64>>,
    }

    // ========================================
    // CONTRACT IMPLEMENTATION
    // ========================================

    impl Default for EscrowMultiRelease {
        fn default() -> Self {
            Self::new()
        }
    }

    impl EscrowMultiRelease {
        /// Constructor that initializes the contract
        #[ink(constructor)]
        pub fn new() -> Self {
            Self {
                escrows: Mapping::default(),
                next_escrow_id: 0,
                client_escrows: Mapping::default(),
                freelancer_escrows: Mapping::default(),
            }
        }

        /// Create a new escrow with milestones
        ///
        /// # Arguments
        /// * `freelancer` - Account of the freelancer who will receive payments
        /// * `milestones` - Vector of milestones defining payment structure
        /// * `arbiter` - Optional arbiter account for dispute resolution
        ///
        /// # Errors
        /// * `EmptyMilestones` - If milestones vector is empty
        /// * `ZeroAmount` - If total amount of milestones is zero
        ///
        /// # Events
        /// * `EscrowCreated` - Emitted when escrow is successfully created
        #[ink(message)]
        pub fn create_escrow(
            &mut self,
            freelancer: AccountId,
            milestones: Vec<Milestone>,
            arbiter: Option<AccountId>,
        ) -> Result<u64> {
            let caller = self.env().caller();

            // Validate milestones
            if milestones.is_empty() {
                return Err(EscrowError::EmptyMilestones);
            }

            // Calculate total amount and validate
            let total_amount: Balance = milestones
                .iter()
                .map(|m| m.amount)
                .sum();

            if total_amount == 0 {
                return Err(EscrowError::ZeroAmount);
            }

            // Validate milestone IDs are unique and sequential
            for (idx, milestone) in milestones.iter().enumerate() {
                if milestone.id != idx as u32 {
                    return Err(EscrowError::InvalidAmount); // Reuse for validation error
                }
                if milestone.released {
                    return Err(EscrowError::InvalidStatus); // Milestones should start unreleased
                }
            }

            // Create escrow
            let escrow_id = self.next_escrow_id;
            let created_at = self.env().block_timestamp();

            let escrow = Escrow {
                id: escrow_id,
                client: caller,
                freelancer,
                arbiter,
                total_amount,
                deposited: 0,
                milestones,
                status: EscrowStatus::Created,
                cancel_requested_by: None,
                created_at,
            };

            // Store escrow
            self.escrows.insert(escrow_id, &escrow);

            // Add to client's escrows list
            let mut client_list = self.client_escrows.get(caller).unwrap_or_default();
            client_list.push(escrow_id);
            self.client_escrows.insert(caller, &client_list);

            // Add to freelancer's escrows list
            let mut freelancer_list = self.freelancer_escrows.get(escrow.freelancer).unwrap_or_default();
            freelancer_list.push(escrow_id);
            self.freelancer_escrows.insert(escrow.freelancer, &freelancer_list);

            // Increment escrow counter
            self.next_escrow_id += 1;

            // Emit event
            self.env().emit_event(EscrowCreated {
                escrow_id,
                client: caller,
                freelancer: escrow.freelancer,
                arbiter: escrow.arbiter,
                total_amount,
            });

            Ok(escrow_id)
        }

        /// Fund an escrow with the required amount
        ///
        /// # Arguments
        /// * `escrow_id` - ID of the escrow to fund
        ///
        /// # Errors
        /// * `EscrowNotFound` - If escrow doesn't exist
        /// * `Unauthorized` - If caller is not the client
        /// * `InvalidStatus` - If escrow is not in Created status
        /// * `InsufficientFunds` - If transferred amount is less than total_amount
        ///
        /// # Events
        /// * `EscrowFunded` - Emitted when escrow is successfully funded
        #[ink(message, payable)]
        pub fn fund_escrow(&mut self, escrow_id: u64) -> Result<()> {
            let caller = self.env().caller();
            let transferred = self.env().transferred_value();

            let mut escrow = self.escrows.get(escrow_id).ok_or(EscrowError::EscrowNotFound)?;

            // Verify caller is the client
            if escrow.client != caller {
                return Err(EscrowError::Unauthorized);
            }

            // Verify escrow is in Created status
            if escrow.status != EscrowStatus::Created {
                return Err(EscrowError::InvalidStatus);
            }

            // Verify transferred amount matches total_amount
            if transferred < escrow.total_amount {
                return Err(EscrowError::InsufficientFunds);
            }

            // Update escrow
            escrow.deposited = escrow.total_amount;
            escrow.status = EscrowStatus::Funded;
            self.escrows.insert(escrow_id, &escrow);

            // Emit event
            self.env().emit_event(EscrowFunded {
                escrow_id,
                amount: transferred,
            });

            Ok(())
        }

        /// Release payment for a specific milestone
        ///
        /// # Arguments
        /// * `escrow_id` - ID of the escrow
        /// * `milestone_id` - ID of the milestone to release
        ///
        /// # Errors
        /// * `EscrowNotFound` - If escrow doesn't exist
        /// * `Unauthorized` - If caller is not the client
        /// * `InvalidStatus` - If escrow is not in Funded or Disputed status
        /// * `MilestoneNotFound` - If milestone doesn't exist
        /// * `MilestoneAlreadyReleased` - If milestone was already released
        ///
        /// # Events
        /// * `MilestoneReleased` - Emitted when milestone is successfully released
        #[ink(message)]
        pub fn release_milestone(&mut self, escrow_id: u64, milestone_id: u32) -> Result<()> {
            let caller = self.env().caller();

            let mut escrow = self.escrows.get(escrow_id).ok_or(EscrowError::EscrowNotFound)?;

            // Verify caller is the client
            if escrow.client != caller {
                return Err(EscrowError::Unauthorized);
            }

            // Verify escrow is in valid status
            if escrow.status != EscrowStatus::Funded && escrow.status != EscrowStatus::Disputed {
                return Err(EscrowError::InvalidStatus);
            }

            // Find milestone and get amount
            let milestone_index = escrow
                .milestones
                .iter()
                .position(|m| m.id == milestone_id)
                .ok_or(EscrowError::MilestoneNotFound)?;

            let milestone = &escrow.milestones[milestone_index];

            if milestone.released {
                return Err(EscrowError::MilestoneAlreadyReleased);
            }

            let milestone_amount = milestone.amount;

            // Mark milestone as released
            escrow.milestones[milestone_index].released = true;

            // Transfer funds to freelancer
            if self.env().transfer(escrow.freelancer, milestone_amount).is_err() {
                return Err(EscrowError::InsufficientFunds);
            }

            // Check if all milestones are released
            let all_released = escrow.milestones.iter().all(|m| m.released);
            if all_released {
                escrow.status = EscrowStatus::Completed;
            }

            // Update escrow
            self.escrows.insert(escrow_id, &escrow);

            // Emit event
            self.env().emit_event(MilestoneReleased {
                escrow_id,
                milestone_id,
                amount: milestone_amount,
            });

            Ok(())
        }

        /// Request cancellation of an escrow
        ///
        /// # Arguments
        /// * `escrow_id` - ID of the escrow to cancel
        ///
        /// # Errors
        /// * `EscrowNotFound` - If escrow doesn't exist
        /// * `Unauthorized` - If caller is not client or freelancer
        /// * `InvalidStatus` - If escrow is in invalid status for cancellation
        ///
        /// # Events
        /// * `CancelRequested` - Emitted when cancellation is requested
        /// * `EscrowCancelled` - Emitted if both parties requested (mutual cancellation)
        #[ink(message)]
        pub fn request_cancel(&mut self, escrow_id: u64) -> Result<()> {
            let caller = self.env().caller();

            let mut escrow = self.escrows.get(escrow_id).ok_or(EscrowError::EscrowNotFound)?;

            // Verify caller is client or freelancer
            if escrow.client != caller && escrow.freelancer != caller {
                return Err(EscrowError::Unauthorized);
            }

            // Verify escrow is in valid status
            if escrow.status == EscrowStatus::Completed || escrow.status == EscrowStatus::Cancelled {
                return Err(EscrowError::InvalidStatus);
            }

            // Check if other party already requested
            if let Some(previous_request) = escrow.cancel_requested_by {
                if previous_request != caller {
                    // Both parties requested - mutual cancellation
                    // Calculate released and unreleased amounts
                    let released_amount: Balance = escrow
                        .milestones
                        .iter()
                        .filter(|m| m.released)
                        .map(|m| m.amount)
                        .sum();

                    let unreleased_amount = escrow.deposited.saturating_sub(released_amount);

                    // Refund unreleased amount to client
                    if unreleased_amount > 0 {
                        if self.env().transfer(escrow.client, unreleased_amount).is_err() {
                            return Err(EscrowError::InsufficientFunds);
                        }
                    }

                    escrow.status = EscrowStatus::Cancelled;

                    // Emit events
                    self.env().emit_event(EscrowCancelled {
                        escrow_id,
                        refund_to_client: unreleased_amount,
                        refund_to_freelancer: released_amount,
                    });
                }
            } else {
                // First cancellation request
                escrow.cancel_requested_by = Some(caller);
                
                // Set to Disputed status (requires arbiter or mutual agreement)
                escrow.status = EscrowStatus::Disputed;

                self.env().emit_event(CancelRequested {
                    escrow_id,
                    requested_by: caller,
                });
            }

            // Update escrow
            self.escrows.insert(escrow_id, &escrow);

            Ok(())
        }

        /// Approve cancellation (mutual agreement)
        ///
        /// # Arguments
        /// * `escrow_id` - ID of the escrow to approve cancellation
        ///
        /// # Errors
        /// * `EscrowNotFound` - If escrow doesn't exist
        /// * `Unauthorized` - If caller is not the other party
        /// * `InvalidStatus` - If no cancellation was requested
        ///
        /// # Events
        /// * `EscrowCancelled` - Emitted when cancellation is approved
        #[ink(message)]
        pub fn approve_cancel(&mut self, escrow_id: u64) -> Result<()> {
            let caller = self.env().caller();

            let mut escrow = self.escrows.get(escrow_id).ok_or(EscrowError::EscrowNotFound)?;

            // Verify cancellation was requested
            let requested_by = escrow.cancel_requested_by.ok_or(EscrowError::InvalidStatus)?;

            // Verify caller is the other party
            if requested_by == escrow.client {
                if caller != escrow.freelancer {
                    return Err(EscrowError::Unauthorized);
                }
            } else if requested_by == escrow.freelancer {
                if caller != escrow.client {
                    return Err(EscrowError::Unauthorized);
                }
            } else {
                return Err(EscrowError::Unauthorized);
            }

            // Calculate released and unreleased amounts
            let released_amount: Balance = escrow
                .milestones
                .iter()
                .filter(|m| m.released)
                .map(|m| m.amount)
                .sum();

            let unreleased_amount = escrow.deposited.saturating_sub(released_amount);

            // Refund unreleased amount to client
            if unreleased_amount > 0 {
                if self.env().transfer(escrow.client, unreleased_amount).is_err() {
                    return Err(EscrowError::InsufficientFunds);
                }
            }

            escrow.status = EscrowStatus::Cancelled;
            self.escrows.insert(escrow_id, &escrow);

            // Emit event
            self.env().emit_event(EscrowCancelled {
                escrow_id,
                refund_to_client: unreleased_amount,
                refund_to_freelancer: released_amount,
            });

            Ok(())
        }

        /// Resolve a dispute by the designated arbiter
        ///
        /// # Arguments
        /// * `escrow_id` - ID of the escrow in dispute
        /// * `freelancer_share` - Amount to give to freelancer
        /// * `client_refund` - Amount to refund to client
        ///
        /// # Errors
        /// * `EscrowNotFound` - If escrow doesn't exist
        /// * `Unauthorized` - If caller is not the arbiter
        /// * `InvalidStatus` - If escrow is not in Disputed status
        /// * `InvalidAmount` - If freelancer_share + client_refund != deposited
        ///
        /// # Events
        /// * `DisputeResolved` - Emitted when dispute is resolved
        #[ink(message)]
        pub fn resolve_dispute_by_arbiter(
            &mut self,
            escrow_id: u64,
            freelancer_share: Balance,
            client_refund: Balance,
        ) -> Result<()> {
            let caller = self.env().caller();

            let mut escrow = self.escrows.get(escrow_id).ok_or(EscrowError::EscrowNotFound)?;

            // Verify caller is the arbiter
            let arbiter = escrow.arbiter.ok_or(EscrowError::InvalidArbiter)?;
            if arbiter != caller {
                return Err(EscrowError::Unauthorized);
            }

            // Verify escrow is in Disputed status
            if escrow.status != EscrowStatus::Disputed {
                return Err(EscrowError::InvalidStatus);
            }

            // Verify amounts sum to deposited amount
            if freelancer_share.saturating_add(client_refund) != escrow.deposited {
                return Err(EscrowError::InvalidAmount);
            }

            // Transfer funds
            if freelancer_share > 0 {
                if self.env().transfer(escrow.freelancer, freelancer_share).is_err() {
                    return Err(EscrowError::InsufficientFunds);
                }
            }

            if client_refund > 0 {
                if self.env().transfer(escrow.client, client_refund).is_err() {
                    return Err(EscrowError::InsufficientFunds);
                }
            }

            escrow.status = EscrowStatus::Cancelled;
            self.escrows.insert(escrow_id, &escrow);

            // Emit event
            self.env().emit_event(DisputeResolved {
                escrow_id,
                freelancer_share,
                client_refund,
            });

            Ok(())
        }

        /// Get escrow details by ID
        ///
        /// # Arguments
        /// * `escrow_id` - ID of the escrow to query
        ///
        /// # Returns
        /// * `Option<Escrow>` - Escrow if it exists, None otherwise
        #[ink(message)]
        pub fn get_escrow(&self, escrow_id: u64) -> Option<Escrow> {
            self.escrows.get(escrow_id)
        }

        /// Get all escrow IDs for a client
        ///
        /// # Arguments
        /// * `client` - Account ID of the client
        ///
        /// # Returns
        /// * `Vec<u64>` - Vector of escrow IDs
        #[ink(message)]
        pub fn get_escrows_by_client(&self, client: AccountId) -> Vec<u64> {
            self.client_escrows.get(client).unwrap_or_default()
        }

        /// Get all escrow IDs for a freelancer
        ///
        /// # Arguments
        /// * `freelancer` - Account ID of the freelancer
        ///
        /// # Returns
        /// * `Vec<u64>` - Vector of escrow IDs
        #[ink(message)]
        pub fn get_escrows_by_freelancer(&self, freelancer: AccountId) -> Vec<u64> {
            self.freelancer_escrows.get(freelancer).unwrap_or_default()
        }

        /// Get all milestones for an escrow
        ///
        /// # Arguments
        /// * `escrow_id` - ID of the escrow
        ///
        /// # Returns
        /// * `Vec<Milestone>` - Vector of milestones
        #[ink(message)]
        pub fn get_milestones(&self, escrow_id: u64) -> Vec<Milestone> {
            self.escrows
                .get(escrow_id)
                .map(|escrow| escrow.milestones)
                .unwrap_or_default()
        }
    }

    // ========================================
    // UNIT TESTS
    // ========================================

    #[cfg(test)]
    mod tests {
        use super::*;

        /// Helper function to get default accounts
        fn default_accounts() -> ink::env::test::DefaultAccounts<ink::env::DefaultEnvironment> {
            ink::env::test::default_accounts::<ink::env::DefaultEnvironment>()
        }

        /// Helper function to set caller
        fn set_caller(account: AccountId) {
            ink::env::test::set_caller::<ink::env::DefaultEnvironment>(account);
        }

        /// Helper function to set balance
        /// In ink! 5.0, minimum balance is 1,000,000 (except for 0 which reaps the account)
        fn set_balance(account: AccountId, balance: Balance) {
            let min_balance: Balance = 1_000_000;
            // If balance > 0, ensure it's at least the minimum
            let actual_balance = if balance > 0 && balance < min_balance {
                min_balance
            } else {
                balance
            };
            ink::env::test::set_account_balance::<ink::env::DefaultEnvironment>(account, actual_balance);
        }

        /// Helper function to create test milestones
        fn create_test_milestones() -> Vec<Milestone> {
            vec![
                Milestone {
                    id: 0,
                    amount: 1000,
                    released: false,
                    description: "Milestone 1".to_string(),
                },
                Milestone {
                    id: 1,
                    amount: 2000,
                    released: false,
                    description: "Milestone 2".to_string(),
                },
            ]
        }

        #[ink::test]
        fn new_works() {
            let contract = EscrowMultiRelease::new();
            assert_eq!(contract.get_escrows_by_client(default_accounts().alice), Vec::<u64>::new());
        }

        #[ink::test]
        fn test_create_escrow_success() {
            let accounts = default_accounts();
            set_caller(accounts.alice);
            set_balance(accounts.alice, 10_000_000);

            let mut contract = EscrowMultiRelease::new();
            let milestones = create_test_milestones();

            let result = contract.create_escrow(accounts.bob, milestones.clone(), None);

            assert!(result.is_ok());
            let escrow_id = result.unwrap();

            let escrow = contract.get_escrow(escrow_id).unwrap();
            assert_eq!(escrow.client, accounts.alice);
            assert_eq!(escrow.freelancer, accounts.bob);
            assert_eq!(escrow.total_amount, 3000);
            assert_eq!(escrow.status, EscrowStatus::Created);
            assert_eq!(escrow.milestones.len(), 2);
        }

        #[ink::test]
        fn test_create_escrow_empty_milestones_fails() {
            let accounts = default_accounts();
            set_caller(accounts.alice);

            let mut contract = EscrowMultiRelease::new();

            let result = contract.create_escrow(accounts.bob, vec![], None);

            assert_eq!(result, Err(EscrowError::EmptyMilestones));
        }

        #[ink::test]
        fn test_fund_escrow_success() {
            let accounts = default_accounts();
            set_caller(accounts.alice);
            set_balance(accounts.alice, 10_000_000);

            let mut contract = EscrowMultiRelease::new();
            let milestones = create_test_milestones();
            let escrow_id = contract.create_escrow(accounts.bob, milestones, None).unwrap();

            // Fund escrow
            ink::env::test::set_value_transferred::<ink::env::DefaultEnvironment>(3000);
            let result = contract.fund_escrow(escrow_id);

            assert!(result.is_ok());

            let escrow = contract.get_escrow(escrow_id).unwrap();
            assert_eq!(escrow.deposited, 3000);
            assert_eq!(escrow.status, EscrowStatus::Funded);
        }

        #[ink::test]
        fn test_fund_escrow_unauthorized_fails() {
            let accounts = default_accounts();
            set_caller(accounts.alice);
            set_balance(accounts.alice, 10_000_000);

            let mut contract = EscrowMultiRelease::new();
            let milestones = create_test_milestones();
            let escrow_id = contract.create_escrow(accounts.bob, milestones, None).unwrap();

            // Try to fund as Bob (should fail)
            set_caller(accounts.bob);
            ink::env::test::set_value_transferred::<ink::env::DefaultEnvironment>(3000);
            let result = contract.fund_escrow(escrow_id);

            assert_eq!(result, Err(EscrowError::Unauthorized));
        }

        #[ink::test]
        fn test_fund_escrow_insufficient_funds_fails() {
            let accounts = default_accounts();
            set_caller(accounts.alice);
            set_balance(accounts.alice, 10_000_000);

            let mut contract = EscrowMultiRelease::new();
            let milestones = create_test_milestones();
            let escrow_id = contract.create_escrow(accounts.bob, milestones, None).unwrap();

            // Try to fund with insufficient amount
            ink::env::test::set_value_transferred::<ink::env::DefaultEnvironment>(1000);
            let result = contract.fund_escrow(escrow_id);

            assert_eq!(result, Err(EscrowError::InsufficientFunds));
        }

        #[ink::test]
        fn test_release_milestone_success() {
            let accounts = default_accounts();
            set_caller(accounts.alice);
            set_balance(accounts.alice, 10_000_000);
            set_balance(accounts.bob, 1_000_000);

            let mut contract = EscrowMultiRelease::new();
            let milestones = create_test_milestones();
            let escrow_id = contract.create_escrow(accounts.bob, milestones, None).unwrap();

            // Fund escrow
            ink::env::test::set_value_transferred::<ink::env::DefaultEnvironment>(3000);
            contract.fund_escrow(escrow_id).unwrap();

            // Release first milestone
            let result = contract.release_milestone(escrow_id, 0);

            assert!(result.is_ok());

            let escrow = contract.get_escrow(escrow_id).unwrap();
            assert!(escrow.milestones[0].released);
            assert!(!escrow.milestones[1].released);
            assert_eq!(escrow.status, EscrowStatus::Funded); // Not all released yet
        }

        #[ink::test]
        fn test_release_all_milestones_completes_escrow() {
            let accounts = default_accounts();
            set_caller(accounts.alice);
            set_balance(accounts.alice, 10_000_000);
            set_balance(accounts.bob, 1_000_000);

            let mut contract = EscrowMultiRelease::new();
            let milestones = create_test_milestones();
            let escrow_id = contract.create_escrow(accounts.bob, milestones, None).unwrap();

            // Fund escrow
            ink::env::test::set_value_transferred::<ink::env::DefaultEnvironment>(3000);
            contract.fund_escrow(escrow_id).unwrap();

            // Release all milestones
            contract.release_milestone(escrow_id, 0).unwrap();
            contract.release_milestone(escrow_id, 1).unwrap();

            let escrow = contract.get_escrow(escrow_id).unwrap();
            assert_eq!(escrow.status, EscrowStatus::Completed);
            assert!(escrow.milestones.iter().all(|m| m.released));
        }

        #[ink::test]
        fn test_release_milestone_unauthorized_fails() {
            let accounts = default_accounts();
            set_caller(accounts.alice);
            set_balance(accounts.alice, 10_000_000);

            let mut contract = EscrowMultiRelease::new();
            let milestones = create_test_milestones();
            let escrow_id = contract.create_escrow(accounts.bob, milestones, None).unwrap();

            ink::env::test::set_value_transferred::<ink::env::DefaultEnvironment>(3000);
            contract.fund_escrow(escrow_id).unwrap();

            // Try to release as Bob (should fail)
            set_caller(accounts.bob);
            let result = contract.release_milestone(escrow_id, 0);

            assert_eq!(result, Err(EscrowError::Unauthorized));
        }

        #[ink::test]
        fn test_request_cancel_mutual_agreement() {
            let accounts = default_accounts();
            set_caller(accounts.alice);
            set_balance(accounts.alice, 10_000_000);
            set_balance(accounts.bob, 1_000_000);

            let mut contract = EscrowMultiRelease::new();
            let milestones = create_test_milestones();
            let escrow_id = contract.create_escrow(accounts.bob, milestones, None).unwrap();

            ink::env::test::set_value_transferred::<ink::env::DefaultEnvironment>(3000);
            contract.fund_escrow(escrow_id).unwrap();

            // Alice requests cancel
            contract.request_cancel(escrow_id).unwrap();

            // Bob requests cancel (mutual agreement)
            set_caller(accounts.bob);
            contract.request_cancel(escrow_id).unwrap();

            let escrow = contract.get_escrow(escrow_id).unwrap();
            assert_eq!(escrow.status, EscrowStatus::Cancelled);
        }

        #[ink::test]
        fn test_approve_cancel_success() {
            let accounts = default_accounts();
            set_caller(accounts.alice);
            set_balance(accounts.alice, 10_000_000);
            set_balance(accounts.bob, 1_000_000);

            let mut contract = EscrowMultiRelease::new();
            let milestones = create_test_milestones();
            let escrow_id = contract.create_escrow(accounts.bob, milestones, None).unwrap();

            ink::env::test::set_value_transferred::<ink::env::DefaultEnvironment>(3000);
            contract.fund_escrow(escrow_id).unwrap();

            // Alice requests cancel
            contract.request_cancel(escrow_id).unwrap();

            // Bob approves cancel
            set_caller(accounts.bob);
            let result = contract.approve_cancel(escrow_id);

            assert!(result.is_ok());

            let escrow = contract.get_escrow(escrow_id).unwrap();
            assert_eq!(escrow.status, EscrowStatus::Cancelled);
        }

        #[ink::test]
        fn test_resolve_dispute_by_arbiter() {
            let accounts = default_accounts();
            set_caller(accounts.alice);
            set_balance(accounts.alice, 10_000_000);
            set_balance(accounts.bob, 1_000_000);
            set_balance(accounts.charlie, 1_000_000);

            let mut contract = EscrowMultiRelease::new();
            let milestones = create_test_milestones();
            let escrow_id = contract.create_escrow(accounts.bob, milestones, Some(accounts.charlie)).unwrap();

            ink::env::test::set_value_transferred::<ink::env::DefaultEnvironment>(3000);
            contract.fund_escrow(escrow_id).unwrap();

            // Request cancel (creates dispute)
            contract.request_cancel(escrow_id).unwrap();

            // Arbiter resolves dispute
            set_caller(accounts.charlie);
            let result = contract.resolve_dispute_by_arbiter(escrow_id, 1000, 2000);

            assert!(result.is_ok());

            let escrow = contract.get_escrow(escrow_id).unwrap();
            assert_eq!(escrow.status, EscrowStatus::Cancelled);
        }

        #[ink::test]
        fn test_resolve_dispute_unauthorized_fails() {
            let accounts = default_accounts();
            set_caller(accounts.alice);
            set_balance(accounts.alice, 10_000_000);

            let mut contract = EscrowMultiRelease::new();
            let milestones = create_test_milestones();
            let escrow_id = contract.create_escrow(accounts.bob, milestones, Some(accounts.charlie)).unwrap();

            ink::env::test::set_value_transferred::<ink::env::DefaultEnvironment>(3000);
            contract.fund_escrow(escrow_id).unwrap();

            contract.request_cancel(escrow_id).unwrap();

            // Try to resolve as non-arbiter (should fail)
            set_caller(accounts.bob);
            let result = contract.resolve_dispute_by_arbiter(escrow_id, 1000, 2000);

            assert_eq!(result, Err(EscrowError::Unauthorized));
        }

        #[ink::test]
        fn test_get_escrows_by_client() {
            let accounts = default_accounts();
            set_caller(accounts.alice);
            set_balance(accounts.alice, 10_000_000);

            let mut contract = EscrowMultiRelease::new();
            let milestones = create_test_milestones();

            let escrow_id1 = contract.create_escrow(accounts.bob, milestones.clone(), None).unwrap();
            let escrow_id2 = contract.create_escrow(accounts.bob, milestones, None).unwrap();

            let escrows = contract.get_escrows_by_client(accounts.alice);
            assert_eq!(escrows.len(), 2);
            assert!(escrows.contains(&escrow_id1));
            assert!(escrows.contains(&escrow_id2));
        }

        #[ink::test]
        fn test_get_escrows_by_freelancer() {
            let accounts = default_accounts();
            set_caller(accounts.alice);
            set_balance(accounts.alice, 10_000_000);

            let mut contract = EscrowMultiRelease::new();
            let milestones = create_test_milestones();

            let escrow_id = contract.create_escrow(accounts.bob, milestones, None).unwrap();

            let escrows = contract.get_escrows_by_freelancer(accounts.bob);
            assert_eq!(escrows.len(), 1);
            assert_eq!(escrows[0], escrow_id);
        }

        #[ink::test]
        fn test_get_milestones() {
            let accounts = default_accounts();
            set_caller(accounts.alice);
            set_balance(accounts.alice, 10_000_000);

            let mut contract = EscrowMultiRelease::new();
            let milestones = create_test_milestones();
            let escrow_id = contract.create_escrow(accounts.bob, milestones.clone(), None).unwrap();

            let retrieved_milestones = contract.get_milestones(escrow_id);
            assert_eq!(retrieved_milestones.len(), 2);
            assert_eq!(retrieved_milestones[0].id, 0);
            assert_eq!(retrieved_milestones[1].id, 1);
        }
    }
}

