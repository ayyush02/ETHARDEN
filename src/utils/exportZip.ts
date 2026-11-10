import JSZip from 'jszip';
import { CONTRACT_FILES } from '../data/contractsData';

export async function downloadFoundryProjectZip(): Promise<void> {
  const zip = new JSZip();

  // Add all contract files
  for (const file of CONTRACT_FILES) {
    zip.file(file.path, file.code);
  }

  // Add README
  const readmeContent = `# Autonomous Protocol Garden (Foundry Suite)
Solidity ^0.8.24 meta-protocol for autonomous child deployment, non-bypassable fee harvesting, and genetic parameter optimization.

## Quickstart
1. Install Foundry: curl -L https://foundry.paradigm.xyz | bash && foundryup
2. Build contracts: forge build
3. Run tests: forge test -vvv
4. Gas benchmarks: forge test --gas-report
5. Deploy: forge script contracts/script/DeployGarden.s.sol:DeployGardenScript --broadcast
`;
  zip.file('README.md', readmeContent);

  // Generate zip blob
  const blob = await zip.generateAsync({ type: 'blob' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'autonomous-protocol-garden-foundry.zip';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
