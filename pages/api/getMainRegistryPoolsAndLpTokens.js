import Web3 from 'web3';
import configs from 'constants/configs';
import getMainRegistryPoolsFn from 'pages/api/getMainRegistryPools';
import { multiCall } from 'utils/Calls';
import { fn } from 'utils/api';
import { ZERO_ADDRESS } from 'utils/Web3';
import POOL_SWAP_ABI from 'utils/data/abis/json/aave/swap.json';

export default fn(async ({ blockchainId } = {}) => {
  if (typeof blockchainId === 'undefined') blockchainId = 'ethereum';

  const { poolList: mainRegistryPools } = await getMainRegistryPoolsFn.straightCall({ blockchainId });

  const config = configs[blockchainId];
  const web3Side = new Web3(config.rpcUrl);
  const lpTokenAddresses = await multiCall(mainRegistryPools.map((address) => ({
    address,
    abi: POOL_SWAP_ABI,
    methodName: 'lp_token',
    networkSettings: { web3: web3Side, multicall2Address: config.multicall2Address },
  })));

  return ({
    poolsAndLpTokens: mainRegistryPools.map((address, i) => ({
      address,
      lpTokenAddress: (
        // Hardcode the ethereum 3crv token because its pool doesn't have an lp_token method
        (blockchainId === 'ethereum' && address.toLowerCase() === '0xbebc44782c7db0a1a60cb6fe97d0b483032ff1c7') ? '0x6c3f90f043a72fa612cbac8115ee7e52bde6e490' :
        // Hardcode the ethereum renbtc token because its pool doesn't have an lp_token method
        (blockchainId === 'ethereum' && address.toLowerCase() === '0x7fc77b5c7614e1533320ea6ddc2eb61fa00a9714') ? '0x075b1bb99792c9e1041ba13afef80c91a1e70fb3' :
        lpTokenAddresses[i] === ZERO_ADDRESS ? address :
        lpTokenAddresses[i]
      ),
    })),
  });
}, {
  maxAge: 3600, // 1 hour
  normalizer: ([{ blockchainId } = {}]) => blockchainId,
});
