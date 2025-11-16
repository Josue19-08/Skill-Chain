# SkillChain — Guía local mínima (completa y concisa)

Objetivo: levantar nodo local, compilar, desplegar, obtener la address y usarla en el frontend.

---

## 1) Ejecutar nodo local
```bash
cargo install contracts-node --git https://github.com/paritytech/substrate-contracts-node.git
substrate-contracts-node --dev --tmp   # deja esta terminal abierta
```
Endpoint: `ws://127.0.0.1:9944` (cuenta `//Alice` con fondos).

---

## 2) Compilar contrato
```bash
cd contracts/skillchain
cargo contract build --release
```
Genera `target/ink/skillchain.contract`, `.wasm`, `.json`.

---

## 3) Deploy (CLI)
```bash
export WS_LOCAL="ws://127.0.0.1:9944"
export SURI_LOCAL="//Alice"

cargo contract upload --suri $SURI_LOCAL --url $WS_LOCAL --execute target/ink/skillchain.contract
cargo contract instantiate --suri $SURI_LOCAL --url $WS_LOCAL --constructor new --execute
```
Salida: address del contrato (ej.: `5F...`). Guárdala:
```bash
export CONTRACT_ADDR="PEGAR_ADDRESS_AQUI"
```

---

## 4) Probar rápido (CLI)
```bash
# Lectura
cargo contract call \
  --contract $CONTRACT_ADDR \
  --message get_profile \
  --args 5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY \
  --suri //Alice --url $WS_LOCAL --dry-run

# Escritura
cargo contract call \
  --contract $CONTRACT_ADDR \
  --message register_profile \
  --args "ipfs://QmDemoProfile" \
  --suri //Alice --url $WS_LOCAL --execute
```

---

## 5) Integración Frontend (Next.js)
1) Variables en `app/web/.env.local`:
```bash
NEXT_PUBLIC_WS_PROVIDER=ws://127.0.0.1:9944
NEXT_PUBLIC_CONTRACT_ADDRESS=PEGAR_ADDRESS_AQUI
```
2) Ejemplo de uso con `@polkadot/api` y `@polkadot/api-contract` (servidor/cliente):
```ts
// utils/skillchain.ts
import { ApiPromise, WsProvider } from '@polkadot/api';
import { ContractPromise } from '@polkadot/api-contract';
import abi from '../../contracts/skillchain/target/ink/skillchain.json';

const WS = process.env.NEXT_PUBLIC_WS_PROVIDER!;
const ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS!;

export async function getProfile(account: string) {
  const api = await ApiPromise.create({ provider: new WsProvider(WS) });
  const contract = new ContractPromise(api, abi as any, ADDRESS);
  const { result, output } = await contract.query.get_profile(account, { gasLimit: api.registry.createType('WeightV2', { refTime: 2_000_000_000, proofSize: 0 }) });
  await api.disconnect();
  if (result.isOk && output) return output.toHuman();
  throw new Error('Query failed');
}
```
3) Para llamadas de escritura, firma con la extensión (ej. Polkadot.js) desde el cliente usando `contract.tx.register_profile(...)` y `signAndSend` del `InjectedSigner`.

---

## 6) UI de contratos (opcional)
Polkadot.js Apps: `https://polkadot.js.org/apps/?rpc=ws%3A%2F%2F127.0.0.1%3A9944#/contracts` → “Add existing contract” con `skillchain.json` y la address.

---

## 7) Notas clave
- Si cierras el nodo `--tmp`, el estado se borra y la address cambiará tras un nuevo deploy; actualiza tu `.env.local`.
- Mantén `NEXT_PUBLIC_WS_PROVIDER` y `NEXT_PUBLIC_CONTRACT_ADDRESS` sincronizados con tu despliegue local actual.




