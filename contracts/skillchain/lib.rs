#![cfg_attr(not(feature = "std"), no_std, no_main)]
#![allow(unexpected_cfgs)]
#![allow(clippy::cast_possible_truncation)]
#![allow(clippy::arithmetic_side_effects)]

#[ink::contract]
mod skillchain {
    use ink::storage::Mapping;
    use ink::prelude::{string::String, vec::Vec};

    // ========================================
    // TYPES MODULE
    // ========================================

    /// Profile information for a user
    #[derive(Debug, Clone, scale::Encode, scale::Decode)]
    #[cfg_attr(feature = "std", derive(scale_info::TypeInfo, ink::storage::traits::StorageLayout))]
    pub struct Profile {
        /// Owner of the profile
        pub owner: AccountId,
        /// URI pointing to off-chain metadata (IPFS, Arweave, etc.)
        pub metadata_uri: String,
        /// Optional KILT DID URI (e.g., "did:kilt:light:...")
        pub did: Option<String>,
    }

    /// Status of a claim
    #[derive(Debug, Clone, PartialEq, scale::Encode, scale::Decode)]
    #[cfg_attr(feature = "std", derive(scale_info::TypeInfo, ink::storage::traits::StorageLayout))]
    pub enum ClaimStatus {
        /// Claim is pending approval
        Pending,
        /// Claim has been approved by the issuer
        Approved,
    }

    /// Represents a claim in the SkillChain protocol
    #[derive(Debug, Clone, scale::Encode, scale::Decode)]
    #[cfg_attr(feature = "std", derive(scale_info::TypeInfo, ink::storage::traits::StorageLayout))]
    pub struct Claim {
        /// Unique identifier for the claim
        pub id: u64,
        /// Account that issued the claim
        pub issuer: AccountId,
        /// Account that receives the claim
        pub receiver: AccountId,
        /// Type of claim (e.g., "hackathon_win", "contribution")
        pub claim_type: String,
        /// Hash of the proof stored off-chain
        pub proof_hash: Hash,
        /// Current status of the claim
        pub status: ClaimStatus,
    }

    // ========================================
    // ERRORS MODULE
    // ========================================

    /// Error types for the SkillChain contract
    #[derive(Debug, PartialEq, Eq, scale::Encode, scale::Decode)]
    #[cfg_attr(feature = "std", derive(scale_info::TypeInfo))]
    pub enum ContractError {
        /// Profile already exists for this account
        ProfileAlreadyExists,
        /// Profile not found for the specified account
        ProfileNotFound,
        /// Claim not found with the specified ID
        ClaimNotFound,
        /// Only the issuer can approve their own claim
        UnauthorizedApproval,
        /// Claim has already been approved
        ClaimAlreadyApproved,
        /// Invalid DID format
        InvalidDid,
    }

    /// Result type for contract operations
    pub type Result<T> = core::result::Result<T, ContractError>;

    // ========================================
    // EVENTS MODULE
    // ========================================

    /// Emitted when a new profile is registered
    #[ink(event)]
    pub struct ProfileRegistered {
        #[ink(topic)]
        pub owner: AccountId,
        pub metadata_uri: String,
    }

    /// Emitted when a new claim is added
    #[ink(event)]
    pub struct ClaimAdded {
        #[ink(topic)]
        pub claim_id: u64,
        #[ink(topic)]
        pub issuer: AccountId,
        #[ink(topic)]
        pub receiver: AccountId,
        pub claim_type: String,
    }

    /// Emitted when a claim is approved
    #[ink(event)]
    pub struct ClaimApproved {
        #[ink(topic)]
        pub claim_id: u64,
    }

    /// Emitted when a DID is linked to a profile
    #[ink(event)]
    pub struct DidLinked {
        #[ink(topic)]
        pub owner: AccountId,
        pub did: String,
    }

    // ========================================
    // STORAGE MODULE
    // ========================================

    /// Main storage structure for the SkillChain Registry
    #[ink(storage)]
    pub struct SkillChainRegistry {
        /// Mapping from AccountId to Profile
        profiles: Mapping<AccountId, Profile>,
        /// Mapping from claim ID to Claim
        claims: Mapping<u64, Claim>,
        /// Counter for the next claim ID
        next_claim_id: u64,
        /// Mapping from AccountId to their received claim IDs
        user_claims: Mapping<AccountId, Vec<u64>>,
    }

    // ========================================
    // CONTRACT IMPLEMENTATION
    // ========================================

    impl Default for SkillChainRegistry {
        fn default() -> Self {
            Self::new()
        }
    }

    impl SkillChainRegistry {
        /// Constructor that initializes the contract
        #[ink(constructor)]
        pub fn new() -> Self {
            Self {
                profiles: Mapping::default(),
                claims: Mapping::default(),
                next_claim_id: 0,
                user_claims: Mapping::default(),
            }
        }

        /// Register a new profile for the caller
        /// 
        /// # Arguments
        /// * `metadata_uri` - URI pointing to off-chain profile metadata (IPFS, Arweave, etc.)
        /// 
        /// # Errors
        /// * `ProfileAlreadyExists` - If the caller already has a registered profile
        /// 
        /// # Events
        /// * `ProfileRegistered` - Emitted when profile is successfully created
        #[ink(message)]
        pub fn register_profile(&mut self, metadata_uri: String) -> Result<()> {
            let caller = self.env().caller();

            // Check if profile already exists
            if self.profiles.contains(caller) {
                return Err(ContractError::ProfileAlreadyExists);
            }

            // Create new profile
            let profile = Profile {
                owner: caller,
                metadata_uri: metadata_uri.clone(),
                did: None,
            };

            // Store profile
            self.profiles.insert(caller, &profile);

            // Emit event
            self.env().emit_event(ProfileRegistered {
                owner: caller,
                metadata_uri,
            });

            Ok(())
        }

        /// Add a new claim to another user
        /// 
        /// # Arguments
        /// * `receiver` - Account that will receive the claim
        /// * `claim_type` - Type of claim (e.g., "hackathon_win", "job_completed")
        /// * `proof_hash` - Hash of the proof stored off-chain
        /// 
        /// # Returns
        /// * `u64` - The ID of the newly created claim
        /// 
        /// # Events
        /// * `ClaimAdded` - Emitted when claim is successfully created
        #[ink(message)]
        pub fn add_claim(
            &mut self,
            receiver: AccountId,
            claim_type: String,
            proof_hash: Hash,
        ) -> Result<u64> {
            let caller = self.env().caller();
            let claim_id = self.next_claim_id;

            // Create new claim with Pending status
            let claim = Claim {
                id: claim_id,
                issuer: caller,
                receiver,
                claim_type: claim_type.clone(),
                proof_hash,
                status: ClaimStatus::Pending,
            };

            // Store claim
            self.claims.insert(claim_id, &claim);

            // Add claim ID to receiver's claims list
            let mut user_claim_ids = self.user_claims.get(receiver).unwrap_or_default();
            user_claim_ids.push(claim_id);
            self.user_claims.insert(receiver, &user_claim_ids);

            // Increment claim counter
            self.next_claim_id += 1;

            // Emit event
            self.env().emit_event(ClaimAdded {
                claim_id,
                issuer: caller,
                receiver,
                claim_type,
            });

            Ok(claim_id)
        }

        /// Approve a claim (only by the issuer)
        /// 
        /// # Arguments
        /// * `claim_id` - ID of the claim to approve
        /// 
        /// # Errors
        /// * `ClaimNotFound` - If the claim doesn't exist
        /// * `UnauthorizedApproval` - If the caller is not the issuer
        /// * `ClaimAlreadyApproved` - If the claim is already approved
        /// 
        /// # Events
        /// * `ClaimApproved` - Emitted when claim is successfully approved
        #[ink(message)]
        pub fn approve_claim(&mut self, claim_id: u64) -> Result<()> {
            let caller = self.env().caller();

            // Get claim
            let mut claim = self.claims.get(claim_id).ok_or(ContractError::ClaimNotFound)?;

            // Verify caller is the issuer
            if claim.issuer != caller {
                return Err(ContractError::UnauthorizedApproval);
            }

            // Check if already approved
            if claim.status == ClaimStatus::Approved {
                return Err(ContractError::ClaimAlreadyApproved);
            }

            // Update status to Approved
            claim.status = ClaimStatus::Approved;
            self.claims.insert(claim_id, &claim);

            // Emit event
            self.env().emit_event(ClaimApproved { claim_id });

            Ok(())
        }

        /// Get profile for a specific account
        /// 
        /// # Arguments
        /// * `account_id` - Account to query
        /// 
        /// # Returns
        /// * `Option<Profile>` - Profile if it exists, None otherwise
        #[ink(message)]
        pub fn get_profile(&self, account_id: AccountId) -> Option<Profile> {
            self.profiles.get(account_id)
        }

        /// Get all claims for a specific account
        /// 
        /// # Arguments
        /// * `account_id` - Account to query
        /// 
        /// # Returns
        /// * `Vec<Claim>` - Vector of all claims received by the account
        #[ink(message)]
        pub fn get_claims(&self, account_id: AccountId) -> Vec<Claim> {
            // Get claim IDs for the account
            let claim_ids = self.user_claims.get(account_id).unwrap_or_default();

            // Collect all claims
            claim_ids
                .iter()
                .filter_map(|&id| self.claims.get(id))
                .collect()
        }

        /// Get total number of claims in the system
        /// 
        /// # Returns
        /// * `u64` - Total number of claims created
        #[ink(message)]
        pub fn get_total_claims(&self) -> u64 {
            self.next_claim_id
        }

        /// Link a KILT DID to the caller's profile
        /// 
        /// # Arguments
        /// * `did` - KILT DID URI (e.g., "did:kilt:light:...")
        /// 
        /// # Errors
        /// * `ProfileNotFound` - If the caller doesn't have a profile
        /// * `InvalidDid` - If the DID format is invalid
        /// 
        /// # Events
        /// * `DidLinked` - Emitted when DID is successfully linked
        #[ink(message)]
        pub fn link_did(&mut self, did: String) -> Result<()> {
            let caller = self.env().caller();

            // Check if profile exists
            let mut profile = self.profiles.get(caller).ok_or(ContractError::ProfileNotFound)?;

            // Basic DID format validation (must start with "did:kilt:")
            if !did.starts_with("did:kilt:") {
                return Err(ContractError::InvalidDid);
            }

            // Update profile with DID
            profile.did = Some(did.clone());
            self.profiles.insert(caller, &profile);

            // Emit event
            self.env().emit_event(DidLinked {
                owner: caller,
                did: did.clone(),
            });

            Ok(())
        }

        /// Get the DID linked to a profile
        /// 
        /// # Arguments
        /// * `account_id` - Account to query
        /// 
        /// # Returns
        /// * `Option<String>` - DID if linked, None otherwise
        #[ink(message)]
        pub fn get_did(&self, account_id: AccountId) -> Option<String> {
            self.profiles.get(account_id).and_then(|p| p.did.clone())
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

        #[ink::test]
        fn new_works() {
            let contract = SkillChainRegistry::new();
            assert_eq!(contract.get_total_claims(), 0);
        }

        #[ink::test]
        fn test_register_profile_success() {
            let accounts = default_accounts();
            set_caller(accounts.alice);

            let mut contract = SkillChainRegistry::new();
            let result = contract.register_profile("ipfs://QmTest123".to_string());

            assert!(result.is_ok());

            let profile = contract.get_profile(accounts.alice);
            assert!(profile.is_some());
            assert_eq!(profile.unwrap().owner, accounts.alice);
        }

        #[ink::test]
        fn test_register_profile_duplicate_fails() {
            let accounts = default_accounts();
            set_caller(accounts.alice);

            let mut contract = SkillChainRegistry::new();
            
            // First registration should succeed
            let result1 = contract.register_profile("ipfs://QmTest123".to_string());
            assert!(result1.is_ok());

            // Second registration should fail
            let result2 = contract.register_profile("ipfs://QmTest456".to_string());
            assert_eq!(result2, Err(ContractError::ProfileAlreadyExists));
        }

        #[ink::test]
        fn test_add_claim_success() {
            let accounts = default_accounts();
            set_caller(accounts.alice);

            let mut contract = SkillChainRegistry::new();
            
            let result = contract.add_claim(
                accounts.bob,
                "hackathon_win".to_string(),
                Hash::from([0x01; 32]),
            );

            assert!(result.is_ok());
            assert_eq!(result.unwrap(), 0); // First claim ID should be 0
        }

        #[ink::test]
        fn test_add_claim_increments_id() {
            let accounts = default_accounts();
            set_caller(accounts.alice);

            let mut contract = SkillChainRegistry::new();
            
            let id1 = contract.add_claim(
                accounts.bob,
                "hackathon_win".to_string(),
                Hash::from([0x01; 32]),
            ).unwrap();

            let id2 = contract.add_claim(
                accounts.bob,
                "job_completed".to_string(),
                Hash::from([0x02; 32]),
            ).unwrap();

            assert_eq!(id1, 0);
            assert_eq!(id2, 1);
            assert_eq!(contract.get_total_claims(), 2);
        }

        #[ink::test]
        fn test_approve_claim_by_issuer() {
            let accounts = default_accounts();
            set_caller(accounts.alice);

            let mut contract = SkillChainRegistry::new();
            
            let claim_id = contract.add_claim(
                accounts.bob,
                "hackathon_win".to_string(),
                Hash::from([0x01; 32]),
            ).unwrap();

            // Alice (issuer) approves the claim
            let result = contract.approve_claim(claim_id);
            assert!(result.is_ok());

            // Verify claim status is Approved
            let claims = contract.get_claims(accounts.bob);
            assert_eq!(claims.len(), 1);
            assert_eq!(claims[0].status, ClaimStatus::Approved);
        }

        #[ink::test]
        fn test_approve_claim_unauthorized_fails() {
            let accounts = default_accounts();
            set_caller(accounts.alice);

            let mut contract = SkillChainRegistry::new();
            
            let claim_id = contract.add_claim(
                accounts.bob,
                "hackathon_win".to_string(),
                Hash::from([0x01; 32]),
            ).unwrap();

            // Bob tries to approve Alice's claim (should fail)
            set_caller(accounts.bob);
            let result = contract.approve_claim(claim_id);
            assert_eq!(result, Err(ContractError::UnauthorizedApproval));
        }

        #[ink::test]
        fn test_approve_claim_twice_fails() {
            let accounts = default_accounts();
            set_caller(accounts.alice);

            let mut contract = SkillChainRegistry::new();
            
            let claim_id = contract.add_claim(
                accounts.bob,
                "hackathon_win".to_string(),
                Hash::from([0x01; 32]),
            ).unwrap();

            // First approval should succeed
            let result1 = contract.approve_claim(claim_id);
            assert!(result1.is_ok());

            // Second approval should fail
            let result2 = contract.approve_claim(claim_id);
            assert_eq!(result2, Err(ContractError::ClaimAlreadyApproved));
        }

        #[ink::test]
        fn test_get_profile_existing() {
            let accounts = default_accounts();
            set_caller(accounts.alice);

            let mut contract = SkillChainRegistry::new();
            contract.register_profile("ipfs://QmTest123".to_string()).unwrap();

            let profile = contract.get_profile(accounts.alice);
            assert!(profile.is_some());
            assert_eq!(profile.unwrap().metadata_uri, "ipfs://QmTest123");
        }

        #[ink::test]
        fn test_get_profile_nonexistent() {
            let accounts = default_accounts();
            let contract = SkillChainRegistry::new();

            let profile = contract.get_profile(accounts.alice);
            assert!(profile.is_none());
        }

        #[ink::test]
        fn test_get_claims_empty() {
            let accounts = default_accounts();
            let contract = SkillChainRegistry::new();

            let claims = contract.get_claims(accounts.alice);
            assert_eq!(claims.len(), 0);
        }

        #[ink::test]
        fn test_get_claims_multiple() {
            let accounts = default_accounts();
            set_caller(accounts.alice);

            let mut contract = SkillChainRegistry::new();
            
            // Add multiple claims to Bob
            contract.add_claim(
                accounts.bob,
                "hackathon_win".to_string(),
                Hash::from([0x01; 32]),
            ).unwrap();

            contract.add_claim(
                accounts.bob,
                "job_completed".to_string(),
                Hash::from([0x02; 32]),
            ).unwrap();

            contract.add_claim(
                accounts.bob,
                "contribution".to_string(),
                Hash::from([0x03; 32]),
            ).unwrap();

            // Get all claims for Bob
            let claims = contract.get_claims(accounts.bob);
            assert_eq!(claims.len(), 3);
            assert_eq!(claims[0].claim_type, "hackathon_win");
            assert_eq!(claims[1].claim_type, "job_completed");
            assert_eq!(claims[2].claim_type, "contribution");
        }

        #[ink::test]
        fn test_claim_not_found() {
            let accounts = default_accounts();
            set_caller(accounts.alice);

            let mut contract = SkillChainRegistry::new();
            
            // Try to approve non-existent claim
            let result = contract.approve_claim(999);
            assert_eq!(result, Err(ContractError::ClaimNotFound));
        }
    }

    // ========================================
    // E2E TESTS
    // ========================================

    #[cfg(all(test, feature = "e2e-tests"))]
    mod e2e_tests {
        use super::*;
        use ink_e2e::build_message;

        type E2EResult<T> = std::result::Result<T, Box<dyn std::error::Error>>;

        #[ink_e2e::test]
        async fn e2e_register_and_claim_flow(mut client: ink_e2e::Client<C, E>) -> E2EResult<()> {
            // Deploy contract
            let constructor = SkillChainRegistryRef::new();
            let contract_account_id = client
                .instantiate("skillchain", &ink_e2e::alice(), constructor, 0, None)
                .await
                .expect("instantiate failed")
                .account_id;

            // Register profile
            let register_msg = build_message::<SkillChainRegistryRef>(contract_account_id.clone())
                .call(|contract| contract.register_profile("ipfs://QmTest".to_string()));
            
            let _register_result = client
                .call(&ink_e2e::alice(), register_msg, 0, None)
                .await
                .expect("register_profile failed");

            // Add claim
            let add_claim_msg = build_message::<SkillChainRegistryRef>(contract_account_id.clone())
                .call(|contract| contract.add_claim(
                    ink_e2e::account_id(ink_e2e::AccountKeyring::Bob),
                    "hackathon_win".to_string(),
                    Hash::from([0x01; 32]),
                ));
            
            let _claim_result = client
                .call(&ink_e2e::alice(), add_claim_msg, 0, None)
                .await
                .expect("add_claim failed");

            Ok(())
        }
    }
}
