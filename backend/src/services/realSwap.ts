import { ethers } from 'ethers';
import {
  TOKENS,
  UNISWAP_CONTRACTS,
  SWAP_ROUTER_ABI,
  QUOTER_V2_ABI,
  ERC20_ABI,
  WETH_ABI,
  SwapParams,
  SwapResult,
  WalletBalance
} from '../types';

// Sepolia Testnet Configuration
const SEPOLIA_RPC = process.env.RPC_URL || 'https://rpc.ankr.com/eth_sepolia';
const PRIVATE_KEY = process.env.DEPLOYER_PRIVATE_KEY || '';

// Pool fee tiers (in hundredths of a bip)
const FEE_TIERS = {
  LOW: 500,      // 0.05%
  MEDIUM: 3000,  // 0.30%
  HIGH: 10000    // 1.00%
};

/**
 * Get provider and wallet for transactions
 */
function getProviderAndWallet(privateKey?: string): { provider: ethers.JsonRpcProvider; wallet: ethers.Wallet } {
  const key = privateKey || PRIVATE_KEY;
  if (!key) {
    throw new Error('No private key provided and DEPLOYER_PRIVATE_KEY not configured');
  }
  const provider = new ethers.JsonRpcProvider(SEPOLIA_RPC);
  const wallet = new ethers.Wallet(key, provider);
  return { provider, wallet };
}

/**
 * Get token address from symbol
 */
function getTokenAddress(token: string): string {
  const tokenInfo = TOKENS[token];
  if (!tokenInfo) {
    throw new Error(`Unknown token: ${token}`);
  }
  // For ETH, use WETH address for swaps
  if (token === 'ETH') {
    return TOKENS.WETH.address;
  }
  return tokenInfo.address;
}

/**
 * Get token decimals
 */
function getTokenDecimals(token: string): number {
  const tokenInfo = TOKENS[token];
  if (!tokenInfo) {
    throw new Error(`Unknown token: ${token}`);
  }
  return tokenInfo.decimals;
}

/**
 * Get real quote from Uniswap V3 QuoterV2 contract
 */
export async function getRealQuote(
  tokenIn: string,
  tokenOut: string,
  amount: string,
  privateKey?: string
): Promise<{ quote: string; gasEstimate: string; priceImpact: string }> {
  try {
    const { provider } = getProviderAndWallet(privateKey);
    const quoterContract = new ethers.Contract(
      UNISWAP_CONTRACTS.QUOTER_V2,
      QUOTER_V2_ABI,
      provider
    );

    const tokenInAddress = getTokenAddress(tokenIn);
    const tokenOutAddress = getTokenAddress(tokenOut);
    const amountIn = BigInt(amount);

    console.log(`[QuoterV2] Getting quote for ${amount} ${tokenIn} → ${tokenOut}`);
    console.log(`[QuoterV2] TokenIn: ${tokenInAddress}, TokenOut: ${tokenOutAddress}`);

    // Try different fee tiers to find the best quote
    const feeTiers = [FEE_TIERS.MEDIUM, FEE_TIERS.LOW, FEE_TIERS.HIGH];
    let bestQuote = BigInt(0);
    let bestGasEstimate = BigInt(0);
    let bestFee = FEE_TIERS.MEDIUM;

    for (const fee of feeTiers) {
      try {
        const result = await quoterContract.quoteExactInputSingle.staticCall({
          tokenIn: tokenInAddress,
          tokenOut: tokenOutAddress,
          amountIn: amountIn,
          fee: fee,
          sqrtPriceLimitX96: 0
        });

        const amountOut = result.amountOut;
        console.log(`[QuoterV2] Fee tier ${fee}: ${amountOut.toString()}`);

        if (amountOut > bestQuote) {
          bestQuote = amountOut;
          bestGasEstimate = result.gasEstimate;
          bestFee = fee;
        }
      } catch (error) {
        // Pool might not exist for this fee tier, continue
        console.log(`[QuoterV2] Fee tier ${fee} not available`);
      }
    }

    if (bestQuote === BigInt(0)) {
      throw new Error('No liquidity pool found for this pair');
    }

    console.log(`[QuoterV2] Best quote: ${bestQuote.toString()} (fee: ${bestFee})`);

    // Calculate price impact (simplified)
    const priceImpact = '0.01'; // TODO: Calculate actual price impact

    return {
      quote: bestQuote.toString(),
      gasEstimate: bestGasEstimate.toString(),
      priceImpact
    };
  } catch (error) {
    console.error('[QuoterV2] Quote failed:', error);
    throw new Error(`Failed to get quote: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Check if token approval is needed and approve if necessary
 */
async function ensureTokenApproval(
  wallet: ethers.Wallet,
  tokenAddress: string,
  spenderAddress: string,
  amount: bigint
): Promise<void> {
  // Skip approval for native ETH
  if (tokenAddress === TOKENS.WETH.address) {
    console.log('[Approval] Skipping approval for WETH (will be wrapped)');
    return;
  }

  const tokenContract = new ethers.Contract(tokenAddress, ERC20_ABI, wallet);

  try {
    const currentAllowance = await tokenContract.allowance(wallet.address, spenderAddress);
    console.log(`[Approval] Current allowance: ${currentAllowance.toString()}`);

    if (currentAllowance < amount) {
      console.log(`[Approval] Approving ${amount.toString()} tokens...`);
      const approveTx = await tokenContract.approve(spenderAddress, amount);
      await approveTx.wait();
      console.log(`[Approval] ✅ Approved. TX: ${approveTx.hash}`);
    } else {
      console.log('[Approval] Sufficient allowance already exists');
    }
  } catch (error) {
    console.error('[Approval] Failed:', error);
    throw new Error(`Token approval failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Execute a real swap on Uniswap V3 via SwapRouter
 */
export async function executeRealSwap(params: SwapParams): Promise<SwapResult> {
  try {
    const { provider, wallet } = getProviderAndWallet(params.privateKey);

    console.log(`[RealSwap] ========== SWAP START ==========`);
    console.log(`[RealSwap] Wallet: ${wallet.address}`);
    console.log(`[RealSwap] Swap: ${params.amount} ${params.tokenIn} → ${params.tokenOut}`);

    // Check wallet balance
    const balance = await checkWalletBalance(params.walletAddress || wallet.address);
    console.log(`[RealSwap] Wallet balance: ${balance.eth} ETH, ${balance.usdc} USDC`);

    if (!balance.hasEnoughForGas) {
      throw new Error('Insufficient ETH balance for gas fees. Get Sepolia ETH from https://sepoliafaucet.com/');
    }

    const tokenInAddress = getTokenAddress(params.tokenIn);
    const tokenOutAddress = getTokenAddress(params.tokenOut);
    const amountIn = BigInt(params.amount);
    const slippage = params.slippage || 0.5; // Default 0.5% slippage

    // Get quote first
    console.log('[RealSwap] Getting quote...');
    const quoteResult = await getRealQuote(params.tokenIn, params.tokenOut, params.amount, params.privateKey);
    const expectedOut = BigInt(quoteResult.quote);

    // Calculate minimum output with slippage
    const slippageMultiplier = BigInt(Math.floor((100 - slippage) * 100));
    const amountOutMinimum = (expectedOut * slippageMultiplier) / BigInt(10000);

    console.log(`[RealSwap] Expected output: ${expectedOut.toString()}`);
    console.log(`[RealSwap] Min output (with ${slippage}% slippage): ${amountOutMinimum.toString()}`);

    // Handle ETH → Token swap (need to wrap ETH first)
    if (params.tokenIn === 'ETH') {
      console.log('[RealSwap] Wrapping ETH to WETH...');
      const wethContract = new ethers.Contract(TOKENS.WETH.address, WETH_ABI, wallet);
      const wrapTx = await wethContract.deposit({ value: amountIn });
      await wrapTx.wait();
      console.log(`[RealSwap] ✅ Wrapped ETH. TX: ${wrapTx.hash}`);
    }

    // Ensure token approval
    await ensureTokenApproval(wallet, tokenInAddress, UNISWAP_CONTRACTS.SWAP_ROUTER_02, amountIn);

    // Execute swap via SwapRouter
    console.log('[RealSwap] Executing swap via SwapRouter...');
    const swapRouter = new ethers.Contract(
      UNISWAP_CONTRACTS.SWAP_ROUTER_02,
      SWAP_ROUTER_ABI,
      wallet
    );

    const deadline = Math.floor(Date.now() / 1000) + 1800; // 30 minutes

    const swapParams = {
      tokenIn: tokenInAddress,
      tokenOut: tokenOutAddress,
      fee: FEE_TIERS.MEDIUM,
      recipient: params.walletAddress || wallet.address,
      deadline: deadline,
      amountIn: amountIn,
      amountOutMinimum: amountOutMinimum,
      sqrtPriceLimitX96: 0
    };

    // Estimate gas
    const gasEstimate = await swapRouter.exactInputSingle.estimateGas(swapParams);
    console.log(`[RealSwap] Gas estimate: ${gasEstimate.toString()}`);

    // Execute swap
    const swapTx = await swapRouter.exactInputSingle(swapParams, {
      gasLimit: (gasEstimate * BigInt(120)) / BigInt(100) // Add 20% buffer
    });

    console.log(`[RealSwap] Swap TX sent: ${swapTx.hash}`);
    console.log('[RealSwap] Waiting for confirmation...');

    const receipt = await swapTx.wait();

    if (receipt.status === 0) {
      throw new Error('Swap transaction reverted');
    }

    console.log(`[RealSwap] ✅ Swap confirmed! Block: ${receipt.blockNumber}`);
    console.log(`[RealSwap] Gas used: ${receipt.gasUsed.toString()}`);
    console.log(`[RealSwap] ========== SWAP SUCCESS ==========`);

    // Handle Token → ETH swap (unwrap WETH after swap)
    if (params.tokenOut === 'ETH') {
      console.log('[RealSwap] Unwrapping WETH to ETH...');
      const wethContract = new ethers.Contract(TOKENS.WETH.address, WETH_ABI, wallet);
      const wethBalance = await wethContract.balanceOf(wallet.address);
      if (wethBalance > BigInt(0)) {
        const unwrapTx = await wethContract.withdraw(wethBalance);
        await unwrapTx.wait();
        console.log(`[RealSwap] ✅ Unwrapped WETH. TX: ${unwrapTx.hash}`);
      }
    }

    return {
      success: true,
      txHash: swapTx.hash,
      gasUsed: receipt.gasUsed.toString()
    };

  } catch (error) {
    console.error('[RealSwap] ❌ Swap failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Check wallet balance for ETH and tokens
 */
export async function checkWalletBalance(walletAddress: string, privateKey?: string): Promise<WalletBalance> {
  try {
    const { provider } = getProviderAndWallet(privateKey);

    // Get ETH balance
    const ethBalance = await provider.getBalance(walletAddress);
    const ethFormatted = ethers.formatEther(ethBalance);

    // Get WETH balance
    const wethContract = new ethers.Contract(TOKENS.WETH.address, ERC20_ABI, provider);
    const wethBalance = await wethContract.balanceOf(walletAddress);
    const wethFormatted = ethers.formatEther(wethBalance);

    // Get USDC balance
    const usdcContract = new ethers.Contract(TOKENS.USDC.address, ERC20_ABI, provider);
    const usdcBalance = await usdcContract.balanceOf(walletAddress);
    const usdcFormatted = ethers.formatUnits(usdcBalance, 6);

    console.log(`[Balance] ETH: ${ethFormatted}, WETH: ${wethFormatted}, USDC: ${usdcFormatted}`);

    return {
      eth: ethFormatted,
      weth: wethFormatted,
      usdc: usdcFormatted,
      hasEnoughForGas: parseFloat(ethFormatted) >= 0.001
    };
  } catch (error) {
    console.error('[Balance] Check failed:', error);
    return {
      eth: '0',
      weth: '0',
      usdc: '0',
      hasEnoughForGas: false
    };
  }
}

/**
 * Get real pool data from Uniswap V3
 */
export async function getPoolData(token0: string, token1: string, privateKey?: string): Promise<{
  exists: boolean;
  liquidity: string;
  sqrtPriceX96: string;
  tick: number;
}> {
  try {
    const { provider } = getProviderAndWallet(privateKey);
    const token0Address = getTokenAddress(token0);
    const token1Address = getTokenAddress(token1);

    // Factory ABI for getPool
    const factoryAbi = [
      'function getPool(address tokenA, address tokenB, uint24 fee) external view returns (address pool)'
    ];

    const factory = new ethers.Contract(UNISWAP_CONTRACTS.FACTORY, factoryAbi, provider);

    // Try to find pool
    const poolAddress = await factory.getPool(token0Address, token1Address, FEE_TIERS.MEDIUM);

    if (poolAddress === ethers.ZeroAddress) {
      return { exists: false, liquidity: '0', sqrtPriceX96: '0', tick: 0 };
    }

    // Pool ABI for slot0 and liquidity
    const poolAbi = [
      'function slot0() external view returns (uint160 sqrtPriceX96, int24 tick, uint16 observationIndex, uint16 observationCardinality, uint16 observationCardinalityNext, uint8 feeProtocol, bool unlocked)',
      'function liquidity() external view returns (uint128)'
    ];

    const pool = new ethers.Contract(poolAddress, poolAbi, provider);
    const slot0 = await pool.slot0();
    const liquidity = await pool.liquidity();

    return {
      exists: true,
      liquidity: liquidity.toString(),
      sqrtPriceX96: slot0.sqrtPriceX96.toString(),
      tick: slot0.tick
    };
  } catch (error) {
    console.error('[Pool] Failed to get pool data:', error);
    return { exists: false, liquidity: '0', sqrtPriceX96: '0', tick: 0 };
  }
}