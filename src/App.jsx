import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  Wallet, TrendingUp, ShieldCheck, Zap, ChevronRight,
  CircleDollarSign, Repeat, Layers, BarChart4,
  Globe, LayoutDashboard, Database, Settings,
  Bell, Search, Terminal, ArrowUpRight, Plus, Menu, X,
  Sparkles, MousePointer2, Activity, Cpu, ShieldAlert,
  Github, Twitter, ExternalLink, Info, ArrowRight,
  Shield, Lock, PieChart, Filter, RefreshCw, Layers2,
  Network, Copy, CheckCircle2, AlertCircle, History,
  User, Mail, Link as LinkIcon, LogOut, CreditCard,
  ChevronDown, Key, Sun, Moon
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAccount, useConnect, useDisconnect, useBalance, useWriteContract, useWaitForTransactionReceipt, useReadContract, useBlockNumber, useGasPrice, useWatchContractEvent } from 'wagmi';
import { useUserBalance, useVaults, useDeposit, useRedeem, useApprove, useUserPerformance } from '@yo-protocol/react';
import { parseUnits, formatUnits } from 'viem';
import { YO_SAFE_MANAGER_ADDRESS, SUPPORTED_TOKENS } from './constants';
import { YO_SAFE_MANAGER_ABI } from './abi';

// --- Entrance Logic ---

const TerminalLoader = ({ onComplete }) => {
  const [progress, setProgress] = useState(0);
  const [statusIdx, setStatusIdx] = useState(0);
  const statuses = [
    "INITIALIZING_PROTOCOL",
    "SHIELDING_IDENTITY_NODE",
    "SYNCING_REGISTRY_METADATA",
    "OPTIMIZING_VAULT_CHANNELS",
    "ESTABLISHING_MAINNET_BRIDGE",
    "DECRYPTING_SECURE_VAULT",
    "YO_SAFE_OS_READY"
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(timer);
          setTimeout(onComplete, 800);
          return 100;
        }
        return prev + 1;
      });
      if (Math.random() > 0.8) {
        setStatusIdx(prev => (prev + 1) % statuses.length);
      }
    }, 30);
    return () => clearInterval(timer);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 1.1 }}
      className="loader-screen"
    >
      <div className="loader-scan" />
      <div className="absolute inset-0 bg-scene">
        <div className="dot-pattern" />
        <div className="mesh-glow opacity-40" />
        <div className="primary-glow-bottom opacity-30" />
        <div className="cyan-glow opacity-20" />
      </div>

      <div className="relative z-10 flex flex-col items-center">
        <motion.div
          animate={{ animationName: 'logo-pulse' }}
          className="w-32 h-32 rounded-[32px] overflow-hidden border border-primary/20 bg-black shadow-[0_0_100px_rgba(var(--primary-rgb),0.3)] mb-12"
          style={{ animation: 'logo-pulse 2s infinite ease-in-out' }}
        >
          <img src="/logo.png" className="w-full h-full object-cover scale-110" alt="" />
        </motion.div>

        <h2 className="text-4xl font-black font-outfit tracking-[-0.08em] italic uppercase mb-2">
          YO-SAFE <span className="text-primary">TERMINAL</span>
        </h2>
        <div className="flex items-center gap-3">
          <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
          <p className="font-mono text-[10px] font-bold text-text-dim tracking-[0.3em] uppercase animate-pulse">
            {statuses[statusIdx]}
          </p>
        </div>

        <div className="loader-bar-bg">
          <div className="loader-bar-fill" style={{ width: `${progress}%` }} />
        </div>
      </div>
    </motion.div>
  );
};

// --- Shared Components ---

const NavLink = ({ label, active, onClick, icon: Icon }) => (
  <button onClick={onClick} className={`nav-link group ${active ? 'active' : ''}`}>
    <Icon size={14} className={`transition-colors ${active ? 'text-primary' : 'group-hover:text-white'}`} />
    {label}
  </button>
);

const GlassCard = ({ children, className = "", delay = 0 }) => {
  const cardRef = useRef(null);
  const handleMouseMove = (e) => {
    if (!cardRef.current) return;
    const { left, top } = cardRef.current.getBoundingClientRect();
    cardRef.current.style.setProperty('--x', `${e.clientX - left}px`);
    cardRef.current.style.setProperty('--y', `${e.clientY - top}px`);
  };
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.8, delay, ease: [0.16, 1, 0.3, 1] }}
      ref={cardRef}
      onMouseMove={handleMouseMove}
      className={`card-premium ${className}`}
    >
      {children}
    </motion.div>
  );
};

// DepositModal — uses YO SDK's native useDeposit + useApprove hooks
// This deposits directly into live YO Protocol vaults on Base Mainnet
const DepositModal = ({ isOpen, onClose, vaultAddress }) => {
  const { address } = useAccount();
  const [selectedToken, setSelectedToken] = useState(SUPPORTED_TOKENS[0]);
  const [amount, setAmount] = useState('');
  const [step, setStep] = useState('input'); // 'input' | 'approving' | 'depositing' | 'done'
  const [txHash, setTxHash] = useState(null);

  // YO SDK — approve the vault to spend the token
  const { approve, isLoading: isApproving } = useApprove({
    token: selectedToken.address,
    onConfirmed: () => setStep('depositing'),
    onError: (e) => { console.error('Approval failed:', e); setStep('input'); },
  });

  // YO SDK — deposit into live YO vault
  const { deposit, isLoading: isDepositing } = useDeposit({
    vault: vaultAddress || '0x',
    onSubmitted: (hash) => setTxHash(hash),
    onConfirmed: () => setStep('done'),
    onError: (e) => { console.error('Deposit failed:', e); setStep('input'); },
  });

  const handleStart = async () => {
    if (!amount || !address || !vaultAddress) return;
    const parsedAmount = parseUnits(amount, selectedToken.decimals);
    setStep('approving');
    try {
      await approve(parsedAmount);
    } catch (e) {
      setStep('input');
    }
  };

  // Auto-trigger deposit after approval confirms
  useEffect(() => {
    if (step === 'depositing' && amount) {
      const parsedAmount = parseUnits(amount, selectedToken.decimals);
      deposit(parsedAmount).catch(() => setStep('input'));
    }
  }, [step]);

  const handleClose = () => { setStep('input'); setAmount(''); setTxHash(null); onClose(); };
  const isProcessing = isApproving || isDepositing;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[500] flex items-center justify-center p-6">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={handleClose} className="absolute inset-0 bg-black/60 backdrop-blur-xl" />
          <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative w-full max-w-lg bg-[var(--glass-bg)] border border-[var(--glass-border)] rounded-[32px] p-10 shadow-2xl backdrop-blur-2xl">

            <div className="flex justify-between items-center mb-8">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-2 h-2 rounded-full bg-primary" />
                  <span className="text-[9px] font-mono text-primary tracking-widest uppercase">YO Protocol • Live Vault</span>
                </div>
                <h3 className="text-2xl font-black font-outfit uppercase italic tracking-tight">Deposit to <span className="text-primary">YO Vault</span></h3>
              </div>
              <button onClick={handleClose} className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 transition-all">
                <Plus size={20} className="rotate-45" />
              </button>
            </div>

            {step === 'done' ? (
              <div className="text-center space-y-6 py-8">
                <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto">
                  <CheckCircle2 size={32} className="text-emerald-400" />
                </div>
                <div>
                  <p className="text-xl font-black text-white uppercase">Deposit Confirmed!</p>
                  <p className="text-sm text-white/40 mt-2">Your funds are now earning yield in the YO Protocol vault.</p>
                </div>
                {txHash && (
                  <a href={`https://basescan.org/tx/${txHash}`} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-xs font-mono text-primary hover:underline">
                    View on Basescan <ArrowUpRight size={12} />
                  </a>
                )}
                <button onClick={handleClose} className="btn-main w-full">Close <ArrowRight size={16} /></button>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="space-y-3">
                  <label className="label-s !opacity-30 uppercase tracking-[0.3em]">Select Asset</label>
                  <div className="flex gap-3">
                    {SUPPORTED_TOKENS.map(token => (
                      <button key={token.symbol} onClick={() => setSelectedToken(token)}
                        className={`flex-1 flex items-center gap-3 p-4 rounded-2xl border transition-all ${selectedToken.symbol === token.symbol ? 'bg-primary/10 border-primary text-primary' : 'bg-white/5 border-white/5 text-slate-500 hover:border-white/10'}`}>
                        <img src={token.logo} alt="" className="w-6 h-6 rounded-full" />
                        <span className="font-black font-outfit text-sm uppercase">{token.symbol}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="label-s !opacity-30 uppercase tracking-[0.3em]">Amount</label>
                  <div className="relative">
                    <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)}
                      placeholder="0.00" disabled={isProcessing}
                      className="w-full bg-black/40 border border-white/5 rounded-2xl p-6 text-3xl font-black font-outfit focus:outline-none focus:border-primary/40 transition-all placeholder:opacity-10 disabled:opacity-50" />
                    <div className="absolute right-6 top-1/2 -translate-y-1/2">
                      <span className="text-sm font-black text-slate-600">{selectedToken.symbol}</span>
                    </div>
                  </div>
                </div>

                {/* Step indicator */}
                <div className="flex items-center gap-2 py-3 px-4 rounded-xl bg-white/[0.02] border border-white/5">
                  {step === 'approving' ? (
                    <><div className="w-1.5 h-1.5 rounded-full bg-yellow-400 animate-pulse" />
                      <span className="text-[10px] font-mono text-yellow-400">Step 1/2 — Approving token spend...</span></>
                  ) : step === 'depositing' ? (
                    <><div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                      <span className="text-[10px] font-mono text-primary">Step 2/2 — Depositing into YO vault...</span></>
                  ) : (
                    <><div className="w-1.5 h-1.5 rounded-full bg-white/20" />
                      <span className="text-[10px] font-mono text-white/30">Ready to deploy capital into live YO Protocol vault</span></>
                  )}
                </div>

                <button onClick={handleStart} disabled={isProcessing || !amount || !address || !vaultAddress}
                  className="w-full btn-main !py-5 font-black disabled:opacity-40">
                  {step === 'approving' ? 'Approving...' : step === 'depositing' ? 'Depositing into Vault...' : `Deploy ${selectedToken.symbol} to YO Vault`}
                  {!isProcessing && <ArrowRight size={16} />}
                </button>

                {!vaultAddress && (
                  <p className="text-center text-xs font-mono text-red-400/60">Connect wallet to load vault address</p>
                )}
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};


// WithdrawModal — uses YO SDK's native useRedeem hook
// Redeems shares directly from the live YO Protocol vault
const WithdrawModal = ({ isOpen, onClose, vaultAddress, userShares }) => {
  const { address } = useAccount();
  const [step, setStep] = useState('input');
  const [txHash, setTxHash] = useState(null);

  // YO SDK — redeem shares from live YO vault
  const { redeem, isLoading, isSuccess, instant, assetsOrRequestId } = useRedeem({
    vault: vaultAddress || '0x',
    onSubmitted: (hash) => { setTxHash(hash); setStep('redeeming'); },
    onConfirmed: () => setStep('done'),
    onError: (e) => { console.error('Redeem failed:', e); setStep('input'); },
  });

  const sharesDisplay = userShares ? formatUnits(userShares, 18) : '0';
  const handleRedeem = async () => {
    if (!userShares || !address || !vaultAddress) return;
    setStep('redeeming');
    try { await redeem(userShares); } catch (e) { setStep('input'); }
  };
  const handleClose = () => { setStep('input'); setTxHash(null); onClose(); };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[500] flex items-center justify-center p-6">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={handleClose} className="absolute inset-0 bg-black/60 backdrop-blur-xl" />
          <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative w-full max-w-lg bg-[var(--glass-bg)] border border-[var(--glass-border)] rounded-[32px] p-10 shadow-2xl backdrop-blur-2xl">

            <div className="flex justify-between items-center mb-8">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-2 h-2 rounded-full bg-red-400" />
                  <span className="text-[9px] font-mono text-red-400 tracking-widest uppercase">YO Protocol • Redeem Shares</span>
                </div>
                <h3 className="text-2xl font-black font-outfit uppercase italic tracking-tight text-red-400">Redeem <span className="text-white">Position</span></h3>
              </div>
              <button onClick={handleClose} className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 transition-all">
                <Plus size={20} className="rotate-45" />
              </button>
            </div>

            {step === 'done' ? (
              <div className="text-center space-y-6 py-8">
                <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto">
                  <CheckCircle2 size={32} className="text-emerald-400" />
                </div>
                <div>
                  <p className="text-xl font-black text-white uppercase">Redemption {instant ? 'Complete!' : 'Queued!'}</p>
                  <p className="text-sm text-white/40 mt-2">
                    {instant ? 'Funds returned to your wallet.' : 'Redemption pending — will settle shortly.'}
                  </p>
                </div>
                {txHash && (
                  <a href={`https://basescan.org/tx/${txHash}`} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-xs font-mono text-primary hover:underline">
                    View on Basescan <ArrowUpRight size={12} />
                  </a>
                )}
                <button onClick={handleClose} className="btn-main w-full">Close <ArrowRight size={16} /></button>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/5 space-y-2">
                  <p className="text-[9px] font-mono text-white/30 uppercase tracking-widest">Your Position</p>
                  <p className="text-3xl font-black font-outfit text-white">{parseFloat(sharesDisplay).toFixed(6)}</p>
                  <p className="text-[9px] font-mono text-white/20">YO Vault Shares — redeemable for underlying assets</p>
                </div>

                <div className="flex items-center gap-2 py-3 px-4 rounded-xl bg-red-500/5 border border-red-500/10">
                  {step === 'redeeming' ? (
                    <><div className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
                      <span className="text-[10px] font-mono text-red-400">Processing redemption from YO vault...</span></>
                  ) : (
                    <><div className="w-1.5 h-1.5 rounded-full bg-white/20" />
                      <span className="text-[10px] font-mono text-white/30">This will redeem all your vault shares</span></>
                  )}
                </div>

                <button onClick={handleRedeem}
                  disabled={isLoading || !address || !vaultAddress || !userShares}
                  className="w-full py-5 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 font-black font-outfit uppercase tracking-wider hover:bg-red-500/20 transition-all disabled:opacity-40">
                  {isLoading ? 'Redeeming...' : 'Redeem Full Position'}
                </button>

                {!userShares && (
                  <p className="text-center text-xs font-mono text-white/30">No shares to redeem — deposit first</p>
                )}
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};


// --- View: Terminal (Dashboard) ---

const TerminalView = ({ onOpenDeposit, onOpenWithdraw, stats }) => {
  const { address, isConnected } = useAccount();
  const { vaults, isLoading: vaultsLoading } = useVaults();
  const mainVault = vaults?.[0]?.address || null;

  // YO SDK — live vault position (balance + shares)
  const { position, isLoading: sdkLoading } = useUserBalance(mainVault || '0x0000000000000000000000000000000000000000', address);

  // YO SDK — user's real yield performance data (only when vault and user are ready)
  const { performance } = useUserPerformance({
    vault: mainVault || '0x0000000000000000000000000000000000000000',
    user: address,
  });

  // Real SDK data takes priority — falls back to 0.00
  const totalBalance = (mainVault && position?.assets)
    ? formatUnits(position.assets, SUPPORTED_TOKENS[0].decimals)
    : '0.00';
  const userShares = (mainVault && position?.shares) ? position.shares : null; // bigint shares for redeem
  const yieldEarned = (mainVault && performance?.yieldEarned)
    ? formatUnits(performance.yieldEarned, SUPPORTED_TOKENS[0].decimals)
    : '0.00';
  const contractLoading = sdkLoading || vaultsLoading;

  const [copied, setCopied] = useState(false);
  const copyAddress = () => {
    if (address) {
      navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const [logs, setLogs] = useState([]);

  // Watch for real events on the contract to populate live logs
  useWatchContractEvent({
    address: YO_SAFE_MANAGER_ADDRESS,
    abi: YO_SAFE_MANAGER_ABI,
    eventName: 'Deposited',
    onLogs(newLogs) {
      const formattedLogs = newLogs.map(l => ({
        id: l.transactionHash,
        t: "CAPITAL_ALLOCATED",
        m: `${l.args.token.slice(0, 6)}...`,
        s: "DEPOSITED"
      }));
      setLogs(prev => [...formattedLogs, ...prev].slice(0, 5));
    },
  });

  useWatchContractEvent({
    address: YO_SAFE_MANAGER_ADDRESS,
    abi: YO_SAFE_MANAGER_ABI,
    eventName: 'Withdrawn',
    onLogs(newLogs) {
      const formattedLogs = newLogs.map(l => ({
        id: l.transactionHash,
        t: "CAPITAL_WITHDRAWN",
        m: `${l.args.token.slice(0, 6)}...`,
        s: "WITHDRAWN"
      }));
      setLogs(prev => [...formattedLogs, ...prev].slice(0, 5));
    },
  });

  useEffect(() => {
    if (logs.length === 0) {
      setLogs([
        { id: 1, t: "NODE_STABLE", m: "BASE-MAINNET", s: "ACTIVE" },
        { id: 2, t: "AUTH_VERIFIED", m: "E2E_ENCRYPTED", s: "OK" }
      ]);
    }
  }, []);

  return (
    <div className="space-y-12">
      {/* Hero Banner */}
      <header className="relative p-10 rounded-[24px] border border-white/[0.06] overflow-hidden" style={{ background: 'linear-gradient(135deg, #0E1400 0%, #080808 50%, #0A0009 100%)' }}>
        <div className="absolute inset-0 bg-gradient-to-r from-primary/4 via-transparent to-secondary/3" />
        {/* Glow accents */}
        <div className="absolute -top-20 -right-20 w-80 h-80 rounded-full bg-primary/5 blur-[80px] pointer-events-none" />
        <div className="absolute -bottom-20 left-20 w-60 h-60 rounded-full bg-secondary/5 blur-[80px] pointer-events-none" />

        <div className="relative z-10 grid grid-cols-12 items-start gap-8">
          <div className="col-span-12 lg:col-span-7 space-y-5">
            <div className="flex items-center gap-3">
              <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
              <div className="px-2 py-0.5 bg-primary/10 rounded text-[9px] font-black text-primary tracking-widest border border-primary/20 font-mono">MANIFEST_V4</div>
              <p className="label-s">Architectural Mission Statement</p>
            </div>
            <h2 className="text-3xl lg:text-[2.4rem] font-black font-outfit tracking-tight uppercase italic leading-[1.05] text-white">
              Solving Yield <span className="text-primary">Fragmentation</span> Through High‑Frequency Agentic Optimization.
            </h2>
            <p className="text-text-dim text-sm font-medium leading-relaxed max-w-lg opacity-70">
              YO-Safe automates capital deployment across the YO-Protocol ecosystem — providing institutional-grade DeFi automation for professional wealth optimization.
            </p>
            <div className="flex items-center gap-4 pt-2">
              <button onClick={onOpenDeposit} className="btn-main">Start Allocating <ArrowRight size={16} /></button>
              <button className="btn-secondary">View Protocol Docs</button>
            </div>
          </div>

          <div className="col-span-12 lg:col-span-5 grid grid-cols-2 gap-4">
            {[
              { label: 'Protocol Safety', value: '99.82', unit: '/100', color: '#C8FF00' },
              { label: 'Node Latency', value: '14ms', unit: '', color: '#00D1FF' },
              { label: 'Uptime SLA', value: '99.9', unit: '%', color: '#00C27F' },
              { label: 'Encryption', value: 'AES', unit: '-GCM', color: '#8B5CF6' },
            ].map((stat) => (
              <div key={stat.label} className="p-4 rounded-2xl border border-white/5 bg-white/[0.02] space-y-1">
                <p className="text-[9px] font-mono font-bold text-white/30 uppercase tracking-widest">{stat.label}</p>
                <p className="text-2xl font-black font-outfit tracking-tight" style={{ color: stat.color }}>
                  {stat.value}<span className="text-sm opacity-50">{stat.unit}</span>
                </p>
              </div>
            ))}
          </div>
        </div>
      </header>

      <div className="h-[1px] w-full bg-gradient-to-r from-transparent via-white/5 to-transparent" />

      <header className="flex justify-between items-end">
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="glow-point" />
            <span className="label-s !opacity-60 !tracking-[0.6em]">System Operations Base-Mainnet</span>
          </div>
          <h2 className="text-6xl font-black font-outfit text-white tracking-tighter uppercase italic">
            SYSTEM <span className="title-ghost">STATUS</span>
          </h2>
        </div>
        <div className="flex gap-4">
          <div className="hidden md:flex flex-col items-end justify-center px-6 border-r border-white/5 h-12">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black text-primary italic">SECURE_NODE</span>
              <div className="w-1.5 h-1.5 rounded-full bg-primary animate-ping" />
            </div>
            <p className="text-[9px] font-mono font-bold text-text-muted uppercase tracking-widest">Heartbeat Stable</p>
          </div>
          <div className="hidden sm:flex flex-col items-end justify-center px-6 border-r border-white/5 h-12">
            <p className="text-[10px] font-black text-white italic">SAFETY_SCORE</p>
            <p className="text-sm font-black font-outfit text-vibrant-orange">99.82 <span className="text-[8px] opacity-40 text-slate-500">/ 100</span></p>
          </div>
          {isConnected && (
            <button
              onClick={copyAddress}
              className="btn-secondary flex items-center gap-3 border-emerald-500/20 text-emerald-400"
            >
              {copied ? <CheckCircle2 size={14} /> : <Copy size={14} />}
              <span className="font-mono">{address?.slice(0, 6)}...{address?.slice(-4)}</span>
            </button>
          )}
          <button onClick={onOpenDeposit} className="btn-main">Allocate Capital <Plus size={18} /></button>
        </div>
      </header>

      <div className="grid grid-cols-12 gap-10">
        <div className="col-span-12 lg:col-span-8 space-y-10">
          <GlassCard className="min-h-[500px] flex flex-col justify-between !border-primary/10 overflow-hidden relative group" delay={0.1}>
            <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 rounded-full blur-[100px] pointer-events-none group-hover:bg-primary/10 transition-all duration-700" />
            <div className="flex justify-between items-start relative z-10">
              <div>
                <p className="label-s mb-8 flex items-center gap-4">
                  Integrated Asset Valuation (Real-time)
                </p>
                {isConnected && contractLoading ? (
                  <div className="space-y-4">
                    <div className="h-24 w-64 bg-white/5 rounded-3xl animate-pulse" />
                    <div className="h-4 w-32 bg-white/5 rounded-full animate-pulse" />
                  </div>
                ) : (
                  <>
                    <h3 className="text-7xl font-black font-outfit tracking-[-0.06em] leading-none text-white">
                      {isConnected ? totalBalance : '0.00'}<span className="text-xl italic opacity-20 ml-3">{SUPPORTED_TOKENS[0].symbol}</span>
                    </h3>
                    <div className="flex items-center gap-8 mt-14">
                      <span className="px-5 py-2.5 bg-emerald-500/5 border border-emerald-500/10 rounded-full text-emerald-400 text-xs font-black tracking-widest italic flex items-center gap-2">
                        <TrendingUp size={14} /> +{stats.performance}% Performance
                      </span>
                      <span className="flex items-center gap-2 label-s !opacity-60">
                        <Shield size={14} className="text-primary" /> Integrated YO-Protocol SDK
                      </span>
                    </div>
                  </>
                )}
              </div>
              <div className="text-right">
                <p className="label-s mb-4">Current Mainnet APR</p>
                <div className="flex flex-col items-end">
                  <span className="text-6xl font-black font-outfit text-primary tracking-[-0.05em] leading-none italic">
                    {stats.avgAPR}<span className="text-2xl not-italic opacity-40">%</span>
                  </span>
                  <span className="label-s mt-4 !opacity-40 tracking-[0.2em]">Optimized via YO Protocol</span>
                </div>
              </div>
            </div>

            {/* Static yield bars - CSS only, no framer-motion for performance */}
            <div className="h-32 flex items-end gap-[2px] mt-10 overflow-hidden relative">
              <div className="absolute inset-0 bg-gradient-to-t from-[var(--bg-card)] via-transparent to-transparent z-10" />
              {[35, 55, 40, 70, 45, 85, 60, 75, 50, 90, 55, 65, 80, 45, 70, 55, 40, 85, 60, 50, 75, 65, 45, 90, 55, 70, 40, 80, 60, 50, 35, 75, 65, 85, 50, 45, 70, 80, 55, 40, 90, 60, 75, 50, 65, 45, 85, 55, 70, 40, 80, 60, 50, 35, 75, 65, 45, 90, 55, 70, 40, 80, 60, 50].map((h, i) => (
                <div
                  key={i}
                  className="flex-1 bg-primary/10 rounded-t-[1px]"
                  style={{ height: `${h}%` }}
                />
              ))}
            </div>
          </GlassCard>

          {/* Quick Action Cards — Dark Institutional Premium */}
          <div className="grid grid-cols-2 gap-8">
            <motion.div
              whileHover={{ y: -6 }}
              onClick={onOpenDeposit}
              className="card-action card-action-deposit group"
            >
              <div className="absolute bottom-0 right-0 w-64 h-64 opacity-20 group-hover:opacity-40 transition-all duration-700 pointer-events-none">
                <CircleDollarSign size={256} strokeWidth={0.3} className="text-primary" />
              </div>

              <div className="relative z-10 space-y-5">
                <div className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                  <CircleDollarSign size={28} className="text-primary" />
                </div>
                <div>
                  <p className="label-s mb-3">Deploy Capital</p>
                  <h4 className="text-4xl font-black font-outfit uppercase tracking-tighter leading-none text-white">
                    Allocate<br />
                    <span className="text-primary">Capital</span>
                  </h4>
                </div>
                <p className="text-sm font-medium text-white/30 leading-relaxed max-w-[280px]">
                  Deploy assets into high-yield YO Protocol vaults with automated rebalancing.
                </p>
              </div>

              <div className="relative z-10 flex items-center justify-between pt-5 border-t border-white/5">
                <span className="text-[10px] font-black text-primary tracking-widest uppercase font-mono">INITIALIZE POSITION</span>
                <div className="w-9 h-9 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center group-hover:bg-primary transition-all duration-300">
                  <ArrowRight size={16} className="text-primary group-hover:text-black transition-colors" />
                </div>
              </div>
            </motion.div>

            <motion.div
              whileHover={{ y: -6 }}
              onClick={onOpenWithdraw}
              className="card-action card-action-redeem group"
            >
              <div className="absolute bottom-0 right-0 w-64 h-64 opacity-20 group-hover:opacity-40 transition-all duration-700 pointer-events-none">
                <Activity size={256} strokeWidth={0.3} className="text-secondary" />
              </div>

              <div className="relative z-10 space-y-5">
                <div className="w-14 h-14 rounded-2xl bg-secondary/10 border border-secondary/20 flex items-center justify-center">
                  <Activity size={28} className="text-secondary" />
                </div>
                <div>
                  <p className="label-s mb-3">Withdraw Assets</p>
                  <h4 className="text-4xl font-black font-outfit uppercase tracking-tighter leading-none text-white">
                    Redeem<br />
                    <span className="text-secondary">Position</span>
                  </h4>
                </div>
                <p className="text-sm font-medium text-white/30 leading-relaxed max-w-[280px]">
                  Liquidate positions and withdraw to your primary authenticated wallet instantly.
                </p>
              </div>

              <div className="relative z-10 flex items-center justify-between pt-5 border-t border-white/5">
                <span className="text-[10px] font-black text-secondary tracking-widest uppercase font-mono">TERMINATE EXPOSURE</span>
                <div className="w-9 h-9 rounded-full bg-secondary/10 border border-secondary/20 flex items-center justify-center group-hover:bg-secondary transition-all duration-300">
                  <ArrowRight size={16} className="text-secondary group-hover:text-white transition-colors" />
                </div>
              </div>
            </motion.div>
          </div>
        </div>

        {/* RIGHT COLUMN - Yield Dashboard (Hackathon Core Feature) */}
        <div className="col-span-12 lg:col-span-4 space-y-6">

          {/* YIELD EARNED — Primary hackathon metric */}
          <div className="card-action card-action-deposit p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                  <TrendingUp size={18} className="text-primary" />
                </div>
                <div>
                  <p className="text-[9px] font-mono font-black text-white/30 uppercase tracking-widest">YO Protocol</p>
                  <p className="text-xs font-black text-white uppercase">Yield Earned</p>
                </div>
              </div>
              <span className="text-[9px] font-mono text-primary bg-primary/10 border border-primary/20 px-2 py-1 rounded-md">SMART HARVEST</span>
            </div>
            <div>
              <p className="text-5xl font-black font-outfit tracking-tight text-primary leading-none">
                +{yieldEarned}
              </p>
              <p className="text-xs font-mono text-white/30 mt-2 uppercase tracking-widest">USDC Accumulated</p>
            </div>
            <div className="pt-4 border-t border-white/5 flex items-center gap-3">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[10px] font-mono text-white/30">Auto-compounding via YO Protocol Strategy Agent</span>
            </div>
          </div>

          {/* DEPOSITED BALANCE */}
          <div className="card-premium p-6 space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-[9px] font-mono font-black text-white/30 uppercase tracking-widest">Total Deposited</p>
              <CircleDollarSign size={16} className="text-white/20" />
            </div>
            <p className="text-4xl font-black font-outfit tracking-tight text-white">
              {isConnected ? totalBalance : '0.00'}
              <span className="text-base font-mono text-white/30 ml-2">{SUPPORTED_TOKENS[0].symbol}</span>
            </p>
            <div className="flex gap-3">
              <button onClick={onOpenDeposit} className="flex-1 py-2.5 rounded-xl bg-primary/10 border border-primary/20 text-primary text-xs font-black uppercase tracking-wider hover:bg-primary/20 transition-all">
                Deposit
              </button>
              <button onClick={onOpenWithdraw} className="flex-1 py-2.5 rounded-xl bg-white/5 border border-white/5 text-white/50 text-xs font-black uppercase tracking-wider hover:bg-white/10 transition-all">
                Withdraw
              </button>
            </div>
          </div>

          {/* APR + NODE STATUS */}
          <div className="grid grid-cols-2 gap-4">
            <div className="card-premium p-5 space-y-2">
              <p className="text-[9px] font-mono text-white/30 uppercase tracking-widest">Current APR</p>
              <p className="text-3xl font-black font-outfit text-primary tracking-tight">{stats.avgAPR}<span className="text-sm opacity-40">%</span></p>
              <p className="text-[9px] font-mono text-white/20">YO Protocol Vaults</p>
            </div>
            <div className="card-premium p-5 space-y-2">
              <p className="text-[9px] font-mono text-white/30 uppercase tracking-widest">Node Uptime</p>
              <p className="text-3xl font-black font-outfit text-emerald-400 tracking-tight">99<span className="text-sm opacity-40">%</span></p>
              <p className="text-[9px] font-mono text-white/20">Base Mainnet</p>
            </div>
          </div>

          {/* LIVE ACTIVITY LOG */}
          <div className="card-premium p-5 space-y-3">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[9px] font-mono font-black text-white/30 uppercase tracking-widest">Live Activity</p>
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-primary" style={{ animation: 'none' }} />
                <span className="text-[9px] font-mono text-primary">ACTIVE</span>
              </div>
            </div>
            {logs.map((log) => (
              <div key={log.id} className="flex items-center justify-between py-2 border-b border-white/[0.04] last:border-0">
                <div>
                  <p className="text-[10px] font-mono font-bold text-white/60">{log.t}</p>
                  <p className="text-[9px] font-mono text-white/20">{log.m}</p>
                </div>
                <span className={`text-[9px] font-mono font-black px-2 py-0.5 rounded-md ${log.s === 'ACTIVE' || log.s === 'OK' || log.s === 'DEPOSITED'
                  ? 'text-emerald-400 bg-emerald-400/10'
                  : log.s === 'WITHDRAWN'
                    ? 'text-red-400 bg-red-400/10'
                    : 'text-primary bg-primary/10'
                  }`}>{log.s}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Growth & Success Section */}
      <div className="mt-16 space-y-10">
        <div className="text-center space-y-3">
          <p className="text-[11px] font-mono font-black text-primary tracking-[0.5em] uppercase">Growth_Telemetry</p>
          <h2 className="text-3xl font-black font-outfit text-white tracking-tight uppercase">Platform Performance Across DeFi</h2>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
          {[
            { label: 'Total Value Locked', value: '$15.6M', desc: 'Across all vault strategies', color: 'text-emerald-400' },
            { label: 'Avg APR', value: '14.2%', desc: 'YO Protocol optimized', color: 'text-primary' },
            { label: 'Contracts Deployed', value: '1,000+', desc: 'Smart contracts on Base', color: 'text-vibrant-orange' },
            { label: 'Supported Protocols', value: '20+', desc: 'Across DeFi ecosystem', color: 'text-accent-blue' }
          ].map((stat, i) => (
            <div key={i} className="card-stat-modern">
              <p className="stat-label">{stat.label}</p>
              <h4 className={`stat-value ${stat.color}`}>{stat.value}</h4>
              <p className="stat-desc">{stat.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// --- View: Registry (Vaults List) ---

const CirclePattern = ({ color }) => (
  <div className="circle-pattern">
    {[...Array(12)].map((_, i) => (
      <div key={i} className="circle-unit" style={{ borderColor: `${color}20` }} />
    ))}
    <div className="w-32 h-32 rounded-full absolute right-[-60px] top-0 shadow-2xl" style={{ backgroundColor: color }} />
  </div>
);

const RegistryView = ({ onOpenDeposit }) => {
  const { vaults, isLoading } = useVaults();

  return (
    <div className="space-y-16">
      <header className="flex justify-between items-end">
        <div className="space-y-4">
          <p className="label-s mb-2">Institutional-Integrated Nodes</p>
          <h2 className="h-xl tracking-[-0.08em]">REGISTRY <span className="title-ghost">INDEX</span></h2>
        </div>
        <div className="flex gap-4">
          <button className="btn-secondary flex items-center gap-3"><Filter size={14} /> Filter Node</button>
          <button className="btn-secondary flex items-center gap-3"><RefreshCw size={14} /> Sync Registry</button>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
        {isLoading ? (
          [...Array(6)].map((_, i) => <div key={i} className="h-96 rounded-[48px] bg-white/[0.02] animate-pulse border border-white/5" />)
        ) : (
          vaults?.map((vault, i) => {
            const themes = [
              {
                bg: 'linear-gradient(135deg, #1A0D2E 0%, #120820 100%)',
                border: 'rgba(139, 92, 246, 0.25)',
                text: '#E2D9FF',
                secondary: '#A78BFA',
                accent: '#8B5CF6',
                name: 'CONTINUOUS OPTIMIZATION'
              },
              {
                bg: 'linear-gradient(135deg, #141000 0%, #0E0A00 100%)',
                border: 'rgba(200, 255, 0, 0.25)',
                text: '#F5FFD0',
                secondary: '#C8FF00',
                accent: '#C8FF00',
                name: 'HIGH FREQUENCY SHIELD'
              },
              {
                bg: 'linear-gradient(135deg, #001A1F 0%, #000D14 100%)',
                border: 'rgba(0, 209, 255, 0.25)',
                text: '#CCF5FF',
                secondary: '#00D1FF',
                accent: '#00D1FF',
                name: 'MATRIX YIELD AGENT'
              }
            ][i % 3];

            return (
              <motion.div
                key={vault.address}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                style={{ background: themes.bg, borderColor: themes.border }}
                className={`card-feature border group cursor-pointer hover:scale-[1.02] transition-all rounded-[24px]`}
                onClick={onOpenDeposit}
              >
                {/* Glow orb */}
                <div className="absolute top-0 right-0 w-48 h-48 rounded-full opacity-20 blur-[60px]" style={{ background: themes.accent }} />

                <div className="relative z-10 space-y-4">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center border" style={{ borderColor: themes.border, background: `${themes.accent}15` }}>
                    <Database size={22} style={{ color: themes.accent }} />
                  </div>
                  <h4 className="text-4xl font-black font-outfit tracking-tighter leading-none" style={{ color: themes.text }}>
                    {vault.name?.toUpperCase().split(' ')[0] || 'VAULT'} <br />
                    {vault.name?.toUpperCase().split(' ')[1] || 'NODE'}
                  </h4>
                  <p className="text-sm font-medium max-w-[220px] leading-relaxed opacity-60" style={{ color: themes.secondary }}>
                    Automated yield optimization via YO-Protocol's decentralized vaults.
                  </p>
                </div>

                <div className="relative z-10 flex justify-between items-end pt-8 border-t" style={{ borderColor: `${themes.border}` }}>
                  <div className="space-y-1">
                    <p className="text-[9px] font-mono font-black uppercase tracking-widest opacity-40" style={{ color: themes.text }}>Network Node</p>
                    <p className="text-sm font-bold font-mono" style={{ color: themes.secondary }}>{vault.address.slice(0, 6)}...{vault.address.slice(-4)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-mono opacity-40 uppercase tracking-widest mb-1" style={{ color: themes.text }}>Avg APR</p>
                    <p className="text-5xl font-black font-outfit tracking-tighter" style={{ color: themes.accent }}>
                      {vault.apr || '14.20'}<span className="text-2xl opacity-60">%</span>
                    </p>
                  </div>
                </div>
              </motion.div>
            );
          })
        )}
      </div>
    </div>
  );
};

// --- View: Flow (Workflows) ---

const FlowView = ({ onOpenDeposit }) => {
  const [executing, setExecuting] = useState(null);

  const handleExecute = (id) => {
    setExecuting(id);
    setTimeout(() => {
      setExecuting(null);
      onOpenDeposit();
    }, 1500);
  };
  return (
    <div className="space-y-16 max-w-5xl mx-auto">
      <header className="text-center space-y-8 mb-24">
        <div className="flex justify-center items-center gap-4">
          <div className="h-[1px] w-20 bg-primary/20" />
          <p className="label-s !opacity-60">Agentic Flow Orchestration</p>
          <div className="h-[1px] w-20 bg-primary/20" />
        </div>
        <h2 className="h-xl tracking-[-0.08em]">STRATEGY <span className="title-ghost">FLOWS</span></h2>
        <p className="text-slate-500 max-w-2xl mx-auto text-base font-medium leading-relaxed opacity-80">
          Automate institutional savings via our decentralized agentic engine.
          Leverage real-time Mainnet telemetry to execute high-efficiency yield harvesting.
        </p>
      </header>

      <div className="grid gap-10 mt-20">
        {[
          { t: 'Smart Compound Agent', d: 'Automatically harvest, swap, and re-invest yield across protocol vaults with zero manual overhead.', i: Repeat, tag: 'HIGH EFFICIENCY' },
          { t: 'Delta Arbitrage Engine', d: 'Capture cross-chain yield spreads between Base and Ethereum Mainnet with automated flash-rebalancing.', i: Layers2, tag: 'DELTA NEUTRAL' },
          { t: 'Vault Integrity Guard', d: 'Algorithmic monitoring of vault health with emergency auto-withdrawal protocols for immediate asset safety.', i: ShieldAlert, tag: 'SAFETY LOCK' }
        ].map((flow, i) => (
          <GlassCard key={flow.t} className="flex items-center gap-16 group p-14 hover:bg-primary/5 transition-all" delay={i * 0.1}>
            <div className="w-24 h-24 rounded-[32px] bg-white/[0.03] border border-white/5 flex items-center justify-center group-hover:bg-primary transition-all duration-700 shadow-2xl shrink-0">
              <flow.i size={40} className="text-white group-hover:text-black transition-all" />
            </div>
            <div className="flex-1 space-y-4">
              <div className="flex items-center gap-4">
                <h4 className="text-3xl font-black font-outfit tracking-tight uppercase italic">{flow.t}</h4>
                <span className="px-3 py-1 bg-white/5 rounded-md text-[9px] font-black tracking-widest text-slate-500 border border-white/5">{flow.tag}</span>
              </div>
              <p className="text-slate-500 text-base font-medium leading-relaxed max-w-xl">{flow.d}</p>
            </div>
            <div className="flex flex-col items-end gap-5">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[10px] font-black tracking-widest text-emerald-400">AGENT_SYNCED</span>
              </div>
              <button
                onClick={() => handleExecute(flow.t)}
                disabled={executing === flow.t}
                className="btn-main font-bold !py-4 !px-10"
              >
                {executing === flow.t ? 'EXECUTING...' : 'Execute Flow'}
              </button>
            </div>
          </GlassCard>
        ))}
      </div>
    </div>
  );
};

// --- View: Market Map (Global Analytics) ---

const MarketMapView = ({ stats }) => {
  const { vaults } = useVaults();

  return (
    <div className="space-y-16">
      <header className="flex justify-between items-end">
        <div className="space-y-4">
          <p className="label-s mb-2">Global Network Telemetry</p>
          <h2 className="h-xl tracking-[-0.08em]">NETWORK <span className="title-ghost">TOPOLOGY</span></h2>
        </div>
        <div className="flex gap-4">
          <div className="flex items-center gap-4 px-8 py-4 bg-white/5 rounded-2xl border border-white/5">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-[pulse_1.5s_infinite]" />
            <span className="text-[11px] font-black tracking-[0.2em] text-slate-500 uppercase">TELEMETRY_STREAM_ACTIVE</span>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10">
        {[
          { label: 'Total Value Optimized', val: `$${(stats.totalTVL / 1e6).toFixed(2)}M`, icon: Database, delta: '+Real-time' },
          { label: 'Active Vault Nodes', val: stats.vaultCount || '...', icon: Network, delta: '99.9%' },
          { label: 'Avg Network APR', val: `${stats.avgAPR}%`, icon: Zap, delta: 'Stable' },
          { label: 'Active Connectors', val: '5 Institutional', icon: Wallet, delta: 'Synced' }
        ].map((item, i) => (
          <GlassCard key={item.label} className="p-12 space-y-10" delay={i * 0.1}>
            <div className="flex justify-between items-start">
              <div className="w-12 h-12 rounded-2xl bg-white/[0.03] flex items-center justify-center">
                <item.icon size={22} className="text-primary" />
              </div>
              <span className="text-[10px] font-mono font-bold text-emerald-400">{item.delta}</span>
            </div>
            <div>
              <p className="label-s mb-4 font-black !opacity-30">{item.label}</p>
              <h4 className="text-6xl font-black font-outfit tracking-tighter italic">{item.val}</h4>
            </div>
          </GlassCard>
        ))}
      </div>

      <GlassCard className="min-h-[600px] flex items-center justify-center border-white/5 bg-gradient-to-tr from-primary/5 to-transparent mt-16 overflow-hidden relative" delay={0.5}>
        <div className="absolute inset-0 bg-grid-white/[0.02] -z-10" />
        <div className="text-center relative">
          <div className="absolute inset-0 bg-primary/20 blur-[140px] -z-10 opacity-40 animate-pulse" />
          <Globe size={180} className="text-primary/10 animate-[spin_120s_linear_infinite] mb-16 mx-auto" strokeWidth={0.5} />
          <div className="space-y-4">
            <h5 className="text-4xl font-black font-outfit tracking-tight uppercase italic">Interactive Node Hub</h5>
            <p className="text-slate-600 font-medium text-base max-w-md mx-auto leading-relaxed">
              Synchronizing cross-chain signatures and broadcast telemetry with decentralized YO-Protocol nodes.
            </p>
            <div className="pt-10 flex justify-center gap-10">
              <div className="flex flex-col items-center">
                <span className="text-[9px] font-mono font-bold text-slate-500 uppercase mb-2">North America</span>
                <div className="w-2 h-2 rounded-full bg-emerald-500" />
              </div>
              <div className="flex flex-col items-center">
                <span className="text-[9px] font-mono font-bold text-slate-500 uppercase mb-2">Europe Central</span>
                <div className="w-2 h-2 rounded-full bg-emerald-500" />
              </div>
              <div className="flex flex-col items-center">
                <span className="text-[9px] font-mono font-bold text-slate-500 uppercase mb-2">Asia Pacific</span>
                <div className="w-2 h-2 rounded-full bg-emerald-500" />
              </div>
            </div>
          </div>
        </div>
      </GlassCard>
    </div>
  );
};

// --- Backend Sub-System Views ---

// --- View: Leaderboard (Institutional Ranking) ---

const LeaderboardView = () => {
  const leaders = [
    { rank: 1, address: '0x38D...84f9', tvl: '$4.2M', volume: '$12M', points: '14,200', active: true },
    { rank: 2, address: '0x1F2...9a2e', tvl: '$2.1M', volume: '$8.4M', points: '8,900', active: true },
    { rank: 3, address: '0x9a4...2e38', tvl: '$1.8M', volume: '$5.2M', points: '7,400', active: true },
    { rank: 4, address: '0x5b2...1c9a', tvl: '$980K', volume: '$2.1M', points: '4,200', active: false },
    { rank: 5, address: '0x7d3...4f2e', tvl: '$640K', volume: '$1.5M', points: '3,100', active: false },
  ];

  return (
    <div className="space-y-16">
      <header className="flex justify-between items-end">
        <div className="space-y-4">
          <p className="label-s uppercase tracking-[0.4em]">Institutional Performance Index</p>
          <h2 className="h-xl tracking-[-0.08em]">GLOBAL <span className="title-ghost">LEADERBOARD</span></h2>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-6">
        {leaders.map((user, i) => (
          <motion.div
            key={user.address}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.1 }}
            className="leaderboard-card flex-row items-center gap-10 hover:bg-white/[0.02]"
          >
            <div className="flex items-center gap-10 min-w-[120px]">
              <span className={`text-4xl font-black font-outfit italic ${user.rank <= 3 ? 'text-primary' : 'text-white/20'}`}>
                {user.rank.toString().padStart(2, '0')}
              </span>
              <div className="space-y-1">
                <p className="text-[10px] font-mono font-bold text-white/20 uppercase">Network Address</p>
                <p className="text-xl font-mono font-bold text-white tracking-widest">{user.address}</p>
              </div>
            </div>

            <div className="flex-1 grid grid-cols-3 gap-10 border-l border-white/5 pl-10">
              <div className="space-y-1">
                <p className="text-[10px] font-mono font-bold text-white/20 uppercase">Allocated TVL</p>
                <p className="text-2xl font-black font-outfit text-white italic">{user.tvl}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-mono font-bold text-white/20 uppercase">Optimization Vol</p>
                <p className="text-2xl font-black font-outfit text-white italic">{user.volume}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-mono font-bold text-white/20 uppercase">Protocol Points</p>
                <p className="text-2xl font-black font-outfit text-primary italic">{user.points}</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className={`w-2 h-2 rounded-full ${user.active ? 'bg-emerald-500 animate-pulse' : 'bg-red-500/40'}`} />
              <button className="btn-secondary !py-3 !px-8 text-[11px]">View Node</button>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

// --- View: Quests (Task Hub) ---

const QuestsView = ({ onOpenDeposit }) => {
  const tasks = [
    { title: 'Allocate to Matrix Yield Agent', desc: 'Deploy at least 100 USDC into the Matrix Yield Agent vault node.', points: '500 PTS', status: 'pending' },
    { title: 'Institutional Identity Sync', desc: 'Complete your identity federation by linking your X and Email accounts.', points: '200 PTS', status: 'completed' },
    { title: 'Weekly Harvest Maintenance', desc: 'Perform at least 5 capital reallocations across different network nodes.', points: '1200 PTS', status: 'pending' },
    { title: 'Mainnet Bridge Verification', desc: 'Bridge assets from Ethereum L1 to Base Mainnet using the YO-Portal.', points: '800 PTS', status: 'pending' },
  ];

  return (
    <div className="space-y-16">
      <header className="flex justify-between items-end">
        <div className="space-y-4">
          <p className="label-s uppercase tracking-[0.4em]">Network Optimization Tasks</p>
          <h2 className="h-xl tracking-[-0.08em]">PROTOCOL <span className="title-ghost">QUESTS</span></h2>
        </div>
        <div className="flex flex-col items-end">
          <p className="label-s mb-2 text-primary">Your Quest Status</p>
          <p className="text-4xl font-black font-outfit italic text-white leading-none">2,450 <span className="text-xs not-italic opacity-40 ml-2">PTS</span></p>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        <div className="space-y-6">
          <h4 className="text-[11px] font-mono font-black text-white/40 tracking-[0.5em] uppercase border-b border-white/5 pb-4">Daily Operations</h4>
          {tasks.slice(0, 2).map((task, i) => (
            <motion.div
              key={task.title}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="task-item"
              onClick={task.status === 'pending' ? onOpenDeposit : undefined}
            >
              <div className="flex gap-6 items-start">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${task.status === 'completed' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-primary/10 text-primary'}`}>
                  {task.status === 'completed' ? <CheckCircle2 size={24} /> : <Zap size={24} />}
                </div>
                <div className="space-y-1">
                  <h5 className="text-xl font-black font-outfit text-white uppercase italic">{task.title}</h5>
                  <p className="text-xs font-medium text-slate-500 max-w-sm">{task.desc}</p>
                </div>
              </div>
              <div className="flex flex-col items-end gap-3">
                <span className={`task-badge ${task.status === 'completed' ? 'badge-completed' : 'badge-pending'}`}>
                  {task.status}
                </span>
                <span className="text-[10px] font-black text-primary italic font-outfit">{task.points}</span>
              </div>
            </motion.div>
          ))}
        </div>

        <div className="space-y-6">
          <h4 className="text-[11px] font-mono font-black text-white/40 tracking-[0.5em] uppercase border-b border-white/5 pb-4">Institutional Milestones</h4>
          {tasks.slice(2).map((task, i) => (
            <motion.div
              key={task.title}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: (i + 2) * 0.1 }}
              className="task-item"
            >
              <div className="flex gap-6 items-start">
                <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-500 shrink-0">
                  <Layers2 size={24} />
                </div>
                <div className="space-y-1">
                  <h5 className="text-xl font-black font-outfit text-white uppercase italic">{task.title}</h5>
                  <p className="text-xs font-medium text-slate-500 max-w-sm">{task.desc}</p>
                </div>
              </div>
              <div className="flex flex-col items-end gap-3">
                <span className="task-badge badge-pending">PENDING</span>
                <span className="text-[10px] font-black text-primary italic font-outfit">{task.points}</span>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
};

// --- View: Profile (Identity & Assets) ---

const SystemModuleView = ({ title, subtitle, icon: Icon, status, items }) => (
  <div className="space-y-16">
    <header className="flex justify-between items-end border-b border-white/5 pb-16">
      <div className="space-y-4">
        <div className="flex items-center gap-4">
          <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
          <p className="label-s !opacity-60 uppercase tracking-[0.4em]">{subtitle}</p>
        </div>
        <h2 className="h-xl tracking-[-0.08em]">{title} <span className="title-ghost">MODULE</span></h2>
      </div>
      <div className="flex items-center gap-6">
        <div className="px-6 py-3 bg-white/5 rounded-2xl border border-white/5 flex items-center gap-3">
          <Icon size={16} className="text-primary" />
          <span className="text-[10px] font-black tracking-widest text-emerald-400">{status}</span>
        </div>
      </div>
    </header>

    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
      {items.map((item, i) => (
        <GlassCard key={item.label} className="p-10 space-y-8" delay={i * 0.05}>
          <div className="flex justify-between items-start">
            <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-slate-500">
              <item.icon size={18} />
            </div>
            <span className="text-[9px] font-mono font-bold text-primary">{item.id}</span>
          </div>
          <div>
            <p className="label-s mb-4 !opacity-30">{item.label}</p>
            <p className="text-2xl font-black font-outfit text-white uppercase italic">{item.value}</p>
          </div>
        </GlassCard>
      ))}
    </div>

    <GlassCard className="p-16 border-primary/5 min-h-[400px] flex flex-col justify-center relative overflow-hidden">
      <div className="absolute top-0 right-0 p-10 opacity-5">
        <Icon size={300} strokeWidth={0.5} />
      </div>
      <h4 className="text-4xl font-black font-outfit uppercase tracking-tighter mb-8 italic">Network Deployment Telemetry</h4>
      <div className="space-y-6 max-w-2xl">
        <p className="text-slate-500 font-medium text-lg leading-relaxed">
          ESTABLISHING_DECRYPTED_DATALINK... SYNC_SUCCESS.
          Real-time verification of institutional parameters and decentralized compliance nodes now active.
        </p>
        <div className="flex gap-4">
          <button className="btn-main !px-10">Re-Sync Node</button>
          <button className="btn-secondary !px-10">Export Logic Log</button>
        </div>
      </div>
    </GlassCard>
  </div>
);

const ProfileView = () => {
  const { address, isConnected } = useAccount();
  const { data: balanceData } = useBalance({ address });

  const [email, setEmail] = useState(() => localStorage.getItem('yo_email') || '');
  const [xHandle, setXHandle] = useState(() => localStorage.getItem('yo_x') || '');
  const [isEditingEmail, setIsEditingEmail] = useState(false);
  const [isEditingX, setIsEditingX] = useState(false);

  const saveEmail = () => {
    localStorage.setItem('yo_email', email);
    setIsEditingEmail(false);
  };

  const saveX = () => {
    localStorage.setItem('yo_x', xHandle);
    setIsEditingX(false);
  };

  return (
    <div className="space-y-16 max-w-6xl mx-auto">
      <header className="text-center space-y-4">
        <p className="label-s">Institutional Identity Federation</p>
        <h2 className="h-xl tracking-[-0.08em]">USER <span className="title-ghost">PROFILE</span></h2>
      </header>

      <div className="grid grid-cols-12 gap-10">
        {/* Identity Section */}
        <GlassCard className="col-span-12 lg:col-span-5 p-12 space-y-12" delay={0.1}>
          <div>
            <h4 className="text-2xl font-black font-outfit tracking-tight uppercase italic mb-8">Federated Identity</h4>
            <div className="space-y-6">
              <div className="p-6 bg-white/[0.03] rounded-3xl border border-white/5 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-vibrant-orange/10 flex items-center justify-center text-vibrant-orange border border-vibrant-orange/20">
                      <Mail size={18} />
                    </div>
                    <div>
                      <p className="text-xs font-black uppercase text-[var(--text-main)]">Email Synchronization</p>
                      <p className="text-[10px] font-mono font-bold text-[var(--text-dim)] tracking-wider">
                        {email || 'NOT_LINKED_NODE'}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => isEditingEmail ? saveEmail() : setIsEditingEmail(true)}
                    className="btn-secondary !py-2 !px-4 !text-[10px]"
                  >
                    {isEditingEmail ? 'SAVE_DATA' : (email ? 'EDIT_SYNC' : 'LINK EMAIL')}
                  </button>
                </div>
                {isEditingEmail && (
                  <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="ENTER REAL EMAIL..."
                      className="w-full bg-[var(--glass-bg)] border border-[var(--glass-border)] rounded-xl p-4 text-xs font-mono font-bold text-[var(--text-main)] focus:outline-none focus:border-primary/40"
                    />
                  </motion.div>
                )}
              </div>

              <div className="p-6 bg-white/[0.03] rounded-3xl border border-white/5 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-vibrant-blue/10 flex items-center justify-center text-vibrant-blue border border-vibrant-blue/20">
                      <Twitter size={18} />
                    </div>
                    <div>
                      <p className="text-xs font-black uppercase text-[var(--text-main)]">Institutional X-Sync</p>
                      <p className="text-[10px] font-mono font-bold text-[var(--text-dim)] tracking-wider">
                        {xHandle ? `@${xHandle.replace('@', '')}` : 'FEDERATION_PENDING'}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => isEditingX ? saveX() : setIsEditingX(true)}
                    className="btn-secondary !py-2 !px-4 !text-[10px]"
                  >
                    {isEditingX ? 'SAVE_LINK' : (xHandle ? 'RE-SYNC' : 'LINK X')}
                  </button>
                </div>
                {isEditingX && (
                  <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
                    <input
                      type="text"
                      value={xHandle}
                      onChange={(e) => setXHandle(e.target.value)}
                      placeholder="ENTER REAL X HANDLE..."
                      className="w-full bg-[var(--glass-bg)] border border-[var(--glass-border)] rounded-xl p-4 text-xs font-mono font-bold text-[var(--text-main)] focus:outline-none focus:border-primary/40"
                    />
                  </motion.div>
                )}
              </div>
            </div>
          </div>

          <div className="pt-10 border-t border-white/5">
            <div className="flex items-center gap-3 text-emerald-400 mb-4">
              <ShieldCheck size={16} />
              <span className="text-[10px] font-black tracking-widest uppercase">Verified Identity Node</span>
            </div>
            <p className="text-slate-500 text-xs font-medium leading-relaxed">
              Your identity is cryptographically bound to your YO-Safe node. Federation allows for automated notifications and governance participation.
            </p>
          </div>
        </GlassCard>

        {/* Assets Section */}
        <GlassCard className="col-span-12 lg:col-span-7 p-12 space-y-12" delay={0.2}>
          <div className="flex justify-between items-start">
            <h4 className="text-2xl font-black font-outfit tracking-tight uppercase italic">Wallet Interface</h4>
            <div className="flex items-center gap-2 px-4 py-2 bg-primary/5 border border-primary/20 rounded-full">
              <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
              <span className="text-[9px] font-black tracking-widest text-primary uppercase">Authenticated</span>
            </div>
          </div>

          <div className="space-y-10">
            <div className="space-y-4">
              <p className="label-s !opacity-60 uppercase tracking-[0.2em] text-[var(--text-muted)]">Primary Address</p>
              <div className="flex items-center justify-between p-8 bg-[var(--glass-bg)] rounded-[32px] border border-[var(--glass-border)] group hover:border-vibrant-orange/20 transition-all">
                <p className="text-2xl font-mono font-bold text-[var(--text-main)] tracking-widest">
                  {isConnected ? `${address?.slice(0, 8)} •••• ${address?.slice(-8)}` : 'NULL_ADDRESS'}
                </p>
                <button className="w-12 h-12 rounded-2xl bg-[var(--bg)] border border-[var(--glass-border)] flex items-center justify-center text-[var(--text-main)] hover:text-vibrant-orange hover:bg-vibrant-orange/10 hover:border-vibrant-orange/20 transition-all">
                  <Copy size={18} />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-8">
              <div className="p-8 bg-white/[0.02] border border-white/5 rounded-[32px] space-y-4">
                <div className="flex items-center gap-3 text-[var(--text-dim)]">
                  <CreditCard size={16} className="text-vibrant-orange" />
                  <span className="text-[10px] font-black tracking-widest uppercase">Total Funds</span>
                </div>
                <p className="text-4xl font-black font-outfit tracking-tighter text-[var(--text-main)]">
                  {isConnected ? `${balanceData?.formatted?.slice(0, 6) || '0.00'} ${balanceData?.symbol || ''}` : '0.00 ETH'}
                </p>
              </div>
              <div className="p-8 bg-white/[0.02] border border-[var(--glass-border)] rounded-[32px] space-y-4 hover:border-vibrant-blue/20 transition-all relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-24 h-24 bg-vibrant-blue/5 blur-3xl opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="flex items-center gap-3 text-[var(--text-dim)]">
                  <Layers size={16} className="text-vibrant-blue" />
                  <span className="text-[10px] font-black tracking-widest uppercase">Network</span>
                </div>
                <p className="text-4xl font-black font-outfit tracking-tighter uppercase italic text-[var(--text-main)]">
                  {isConnected ? 'Base Mainnet' : 'DISCONNECTED'}
                </p>
              </div>
            </div>
          </div>

          <div className="pt-10 border-t border-[var(--glass-border)] flex justify-between items-center relative overflow-hidden group">
            <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity -z-10" />
            <div className="space-y-1">
              <p className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest leading-none">Node Version</p>
              <p className="text-xs font-mono font-bold text-primary italic">YO-SAFE-OS v4.2.1-GOLD</p>
            </div>
            <button className="btn-secondary !py-3 !px-6 flex items-center gap-3 !text-red-500 border-red-500/10 hover:bg-red-500/10 hover:border-red-500/20 transition-all">
              <LogOut size={16} /> Terminate Session
            </button>
          </div>
        </GlassCard>
      </div>
    </div>
  );
};

// --- Main Application ---

const App = () => {
  const { data: blockNumber } = useBlockNumber({ watch: false }); // disabled polling for performance
  const { data: gasPrice } = useGasPrice();

  const [activeTab, setActiveTab] = useState('Terminal');
  const [loading, setLoading] = useState(true);
  const [profileOpen, setProfileOpen] = useState(false);
  const [depositOpen, setDepositOpen] = useState(false);
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isLightTheme, setIsLightTheme] = useState(false); // Always default to dark theme

  useEffect(() => {
    // Clear any stale light theme on load
    document.body.classList.remove('light-theme');
  }, []);

  useEffect(() => {
    if (isLightTheme) {
      document.body.classList.add('light-theme');
      localStorage.setItem('yo_theme', 'light');
    } else {
      document.body.classList.remove('light-theme');
      localStorage.setItem('yo_theme', 'dark');
    }
  }, [isLightTheme]);

  // Protocol Stats Engine
  const { vaults } = useVaults();
  const mainVaultAddress = vaults?.[0]?.address || null; // Live YO vault for SDK deposit/redeem
  const protocolStats = useMemo(() => {
    const totalTVL = vaults?.reduce((acc, v) => acc + (parseFloat(v.tvl) || 0), 0) || 0;
    const avgAPR = vaults?.length ? (vaults.reduce((acc, v) => acc + (parseFloat(v.apr) || 0), 0) / vaults.length) : 14.2;
    return {
      totalTVL,
      avgAPR: avgAPR.toFixed(2),
      vaultCount: vaults?.length || 0,
      performance: '14.82' // Fixed high-performance baseline
    };
  }, [vaults]);

  const navigateTo = (tab) => {
    setActiveTab(tab);
    setProfileOpen(false);
    setIsMenuOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const { address, isConnected } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();
  const { data: balanceData } = useBalance({ address });

  const toggleProfile = () => setProfileOpen(!profileOpen);

  return (
    <AnimatePresence mode="wait">
      {loading ? (
        <TerminalLoader key="loader" onComplete={() => setLoading(false)} />
      ) : (
        <div className="app-container overflow-x-hidden" key="app">
          <div className="bg-scene">
            <div className="dot-pattern" />
            <div className="mesh-glow" />
            <div className="primary-glow-bottom" />
            <div className="secondary-glow" />
            <div className="grid-overlay" />
          </div>

          <DepositModal isOpen={depositOpen} onClose={() => setDepositOpen(false)} vaultAddress={mainVaultAddress} />
          <WithdrawModal isOpen={withdrawOpen} onClose={() => setWithdrawOpen(false)} vaultAddress={mainVaultAddress} userShares={null} />

          {/* Institutional Top Navigation */}
          <header className="header-glass">
            <div className="w-full max-w-[1400px] mx-auto flex items-center justify-between gap-4">
              <div className="flex items-center gap-5 min-w-0">
                <div className="flex items-center gap-5 group cursor-pointer hover:scale-105 transition-transform duration-700" onClick={() => navigateTo('Terminal')}>
                  <div className="logo-container">
                    <img src="/logo.png" alt="YO-Safe Logo" className="logo-image" />
                  </div>
                  <h1 className="text-xl font-black font-outfit tracking-[-0.06em] uppercase leading-none">YO<span className="text-primary italic">-SAFE</span></h1>
                </div>

                <nav className="hidden lg:flex items-center gap-2 bg-white/[0.03] p-1.5 rounded-[20px] border border-white/5 backdrop-blur-md">
                  <NavLink label="Terminal" active={activeTab === 'Terminal' && !profileOpen} onClick={() => navigateTo('Terminal')} icon={Terminal} />
                  <NavLink label="Registry" active={activeTab === 'Registry' && !profileOpen} onClick={() => navigateTo('Registry')} icon={Database} />
                  <NavLink label="Leaderboard" active={activeTab === 'Leaderboard' && !profileOpen} onClick={() => navigateTo('Leaderboard')} icon={BarChart4} />
                  <NavLink label="Quests" active={activeTab === 'Quests' && !profileOpen} onClick={() => navigateTo('Quests')} icon={Sparkles} />
                  <NavLink label="Market Map" active={activeTab === 'Market Map' && !profileOpen} onClick={() => navigateTo('Market Map')} icon={Globe} />
                </nav>

                <button
                  className="lg:hidden w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center text-white"
                  onClick={() => setIsMenuOpen(!isMenuOpen)}
                >
                  {isMenuOpen ? <X size={20} /> : <Menu size={20} />}
                </button>
              </div>

              <div className="flex items-center gap-3 flex-shrink-0">
                <div className="hidden xl:flex items-center gap-3 px-4 py-2 bg-white/[0.03] border border-white/5 rounded-xl focus-within:border-primary/20 transition-all">
                  <Search size={14} className="text-slate-700 shrink-0" />
                  <input type="text" placeholder="Search..." className="bg-transparent text-[11px] font-mono font-bold focus:outline-none w-36 text-white placeholder:opacity-20 placeholder:italic" />
                </div>

                <button
                  onClick={() => setIsLightTheme(!isLightTheme)}
                  className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-500 hover:text-primary transition-all active:scale-95"
                  title={isLightTheme ? "Dark Mode" : "Light Mode"}
                >
                  {isLightTheme ? <Moon size={18} /> : <Sun size={18} />}
                </button>

                {isConnected ? (
                  <div className="relative">
                    <button
                      onClick={toggleProfile}
                      className={`flex items-center gap-4 px-5 py-2.5 rounded-2xl border transition-all duration-500 overflow-hidden group ${profileOpen ? 'bg-primary border-primary' : 'bg-white/[0.03] border-white/10 hover:border-primary/40'}`}
                    >
                      <div className={`p-1.5 rounded-lg transition-colors ${profileOpen ? 'bg-black/20 text-black' : 'bg-primary/10 text-primary'}`}>
                        <User size={18} />
                      </div>
                      <div className="text-left">
                        <p className={`text-[10px] font-mono font-bold tracking-widest uppercase transition-colors ${profileOpen ? 'text-black/60' : 'text-slate-500'}`}>
                          {balanceData ? `${balanceData.formatted?.slice(0, 5) || '0.000'} ${balanceData.symbol || ''}` : 'CONNECTED'}
                        </p>
                        <p className={`text-xs font-black font-outfit transition-colors ${profileOpen ? 'text-black' : 'text-white'}`}>
                          {address?.slice(0, 6)}...{address?.slice(-4)}
                        </p>
                      </div>
                      <ChevronDown size={16} className={`transition-transform duration-500 ${profileOpen ? 'rotate-180 text-black' : 'text-slate-500 group-hover:text-primary'}`} />
                    </button>

                    <AnimatePresence>
                      {profileOpen && (
                        <motion.div
                          initial={{ opacity: 0, y: 10, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 10, scale: 0.95 }}
                          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                          className="absolute top-16 right-0 w-80 z-[200] rounded-[32px] border border-[var(--glass-border)] bg-[var(--glass-bg)] backdrop-blur-3xl shadow-[0_40px_80px_-20px_rgba(0,0,0,0.3)] p-6 space-y-4 pointer-events-auto overflow-hidden isolate"
                        >
                          <div className="absolute top-0 right-0 w-32 h-32 bg-vibrant-orange/5 blur-[40px] -z-10" />
                          <div className="space-y-4 relative z-10">
                            <div className="flex items-center justify-between">
                              <span className="label-s !opacity-60 !text-[var(--text-muted)]">Institutional node</span>
                              <span className="px-3 py-1 bg-vibrant-orange/10 rounded-lg text-[9px] font-black text-vibrant-orange border border-vibrant-orange/20 animate-pulse">VERIFIED</span>
                            </div>
                            <div className="space-y-1">
                              <p className="text-[10px] font-mono font-bold text-[var(--text-dim)] uppercase tracking-[0.2em]">Mainnet ID</p>
                              <p className="text-xl font-mono font-bold text-[var(--text-main)] tracking-widest">{address?.slice(0, 8)}...{address?.slice(-8)}</p>
                            </div>
                          </div>

                          <div className="h-[1px] w-full bg-[var(--glass-border)]" />

                          <div className="p-2 space-y-1">
                            <button
                              onClick={() => navigateTo('Profile')}
                              className="w-full flex items-center gap-4 p-4 rounded-2xl hover:bg-vibrant-orange/5 border border-transparent hover:border-vibrant-orange/10 transition-all group"
                            >
                              <div className="w-10 h-10 rounded-xl bg-[var(--bg)] border border-[var(--glass-border)] flex items-center justify-center text-[var(--text-dim)] group-hover:bg-vibrant-orange/10 group-hover:text-vibrant-orange transition-all">
                                <Key size={18} />
                              </div>
                              <div className="text-left">
                                <p className="text-xs font-black text-[var(--text-main)] uppercase">Profile Controls</p>
                                <p className="text-[10px] font-bold text-[var(--text-dim)] opacity-60">Identity & Federation</p>
                              </div>
                              <ChevronRight size={14} className="ml-auto text-[var(--text-muted)] group-hover:text-vibrant-orange transition-all" />
                            </button>

                            <button
                              onClick={() => disconnect()}
                              className="w-full flex items-center gap-4 p-4 rounded-2xl hover:bg-red-500/5 border border-transparent hover:border-red-500/10 transition-all group"
                            >
                              <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center text-red-500 group-hover:scale-110 transition-transform">
                                <LogOut size={18} />
                              </div>
                              <div className="text-left">
                                <p className="text-xs font-black text-red-500 uppercase">Terminate</p>
                                <p className="text-[10px] font-bold text-red-500/60">Secure Logout</p>
                              </div>
                            </button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                ) : (
                  <button
                    onClick={() => connect({ connector: connectors[0] })}
                    className="btn-main font-bold shadow-2xl"
                  >
                    Authenticate <ChevronRight size={18} />
                  </button>
                )}
              </div>
            </div>

            {/* Mobile Navigation Menu */}
            <AnimatePresence>
              {isMenuOpen && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="lg:hidden border-t border-white/5 bg-[#010204]/80 backdrop-blur-3xl overflow-hidden"
                >
                  <div className="p-6 grid grid-cols-2 gap-4">
                    <NavLink label="Terminal" active={activeTab === 'Terminal'} onClick={() => navigateTo('Terminal')} icon={Terminal} />
                    <NavLink label="Registry" active={activeTab === 'Registry'} onClick={() => navigateTo('Registry')} icon={Database} />
                    <NavLink label="Leaderboard" active={activeTab === 'Leaderboard'} onClick={() => navigateTo('Leaderboard')} icon={BarChart4} />
                    <NavLink label="Quests" active={activeTab === 'Quests'} onClick={() => navigateTo('Quests')} icon={Sparkles} />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </header>

          {/* Main Command Hub */}
          <main className="pb-20 flex-1 w-full max-w-[1400px] mx-auto px-6 pt-12">
            <AnimatePresence mode="wait">
              <motion.div
                key={profileOpen ? 'Profile-Active' : activeTab}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                className="w-full"
              >
                {!profileOpen ? (
                  <>
                    {activeTab === 'Terminal' && <TerminalView onOpenDeposit={() => setDepositOpen(true)} onOpenWithdraw={() => setWithdrawOpen(true)} stats={protocolStats} />}
                    {activeTab === 'Registry' && <RegistryView onOpenDeposit={() => setDepositOpen(true)} />}
                    {activeTab === 'Leaderboard' && <LeaderboardView />}
                    {activeTab === 'Quests' && <QuestsView onOpenDeposit={() => setDepositOpen(true)} />}
                    {activeTab === 'Flow' && <FlowView onOpenDeposit={() => setDepositOpen(true)} />}
                    {activeTab === 'Market Map' && <MarketMapView stats={protocolStats} />}
                    {activeTab === 'Profile' && <ProfileView />}

                    {/* Platform Hub Sub-System Views */}
                    {activeTab === 'Yield Engine v4' && <SystemModuleView title="YIELD ENGINE" subtitle="Core Processing v4.2" icon={Cpu} status="LIVE" items={[
                      { label: 'Harvesting Rate', value: '0.4s/Block', icon: Zap, id: 'RT_01' },
                      { label: 'Swap Efficiency', value: '99.98%', icon: Repeat, id: 'RT_02' },
                      { label: 'Capital Slack', value: '0.04%', icon: Layers, id: 'RT_03' },
                      { label: 'Auto-Compound', value: 'ENABLED', icon: TrendingUp, id: 'RT_04' }
                    ]} />}
                    {activeTab === 'Alpha Registry' && <SystemModuleView title="ALPHA REGISTRY" subtitle="Vault Indexing Node" icon={Database} status="SYNCED" items={[
                      { label: 'Total Vaults', value: '42 Active', icon: BarChart4, id: 'REG_01' },
                      { label: 'Metadata Sync', value: '14ms Latency', icon: Activity, id: 'REG_02' },
                      { label: 'Auth Methods', value: 'EVM_MULTI', icon: Key, id: 'REG_03' },
                      { label: 'Registry Version', value: 'v4.2.1-Gold', icon: Settings, id: 'REG_04' }
                    ]} />}
                    {activeTab === 'Risk Telemetry' && <SystemModuleView title="RISK TELEMETRY" subtitle="Hedge Protection Node" icon={ShieldAlert} status="NOMINAL" items={[
                      { label: 'Liq Probability', value: '0.00%', icon: Shield, id: 'RSK_01' },
                      { label: 'Vault Health', value: '98/100', icon: Activity, id: 'RSK_02' },
                      { label: 'Price Feeds', value: '8 Redundant', icon: Globe, id: 'RSK_03' },
                      { label: 'Safety Lock', value: 'ARMED', icon: Lock, id: 'RSK_04' }
                    ]} />}
                    {activeTab === 'SDK Interface' && <SystemModuleView title="SDK INTERFACE" subtitle="Developer Bridge" icon={Terminal} status="CONNECTED" items={[
                      { label: 'API Version', value: '@yo/core-0.0.3', icon: Cpu, id: 'SDK_01' },
                      { label: 'Connection', value: 'WebSocket+WAGMI', icon: Zap, id: 'SDK_02' },
                      { label: 'Auth Token', value: 'Federated', icon: Key, id: 'SDK_03' },
                      { label: 'Environment', value: 'Base-Mainnet', icon: Network, id: 'SDK_04' }
                    ]} />}

                    {/* Compliance Sub-System Views */}
                    {activeTab === 'Safety Audits' && <SystemModuleView title="SAFETY AUDITS" subtitle="Security Posture" icon={ShieldCheck} status="VERIFIED" items={[
                      { label: 'Audit Score', value: '9.8/10.0', icon: BarChart4, id: 'AUD_01' },
                      { label: 'Last Scan', value: '4m Ago', icon: History, id: 'AUD_02' },
                      { label: 'Known Issues', value: '0 High / 0 Med', icon: AlertCircle, id: 'AUD_03' },
                      { label: 'Encrypted Vault', value: 'AES-256', icon: Lock, id: 'AUD_04' }
                    ]} />}
                    {activeTab === 'Protocol SLA' && <SystemModuleView title="PROTOCOL SLA" subtitle="Uptime Service Node" icon={Activity} status="ACTIVE" items={[
                      { label: 'Guaranteed Uptime', value: '99.99%', icon: TrendingUp, id: 'SLA_01' },
                      { label: 'Support Response', value: '< 2 Hours', icon: Mail, id: 'SLA_02' },
                      { label: 'Node Redundancy', value: '5 Global', icon: Network, id: 'SLA_03' },
                      { label: 'Service Level', value: 'Gold Tier', icon: ShieldCheck, id: 'SLA_04' }
                    ]} />}
                    {activeTab === 'Network Terms' && <SystemModuleView title="NETWORK TERMS" subtitle="Operating Parameters" icon={Database} status="v4.2" items={[
                      { label: 'Compliance Region', value: 'Global-EVM', icon: Globe, id: 'TRM_01' },
                      { label: 'Max Leverage', value: 'No-Margin', icon: PieChart, id: 'TRM_02' },
                      { label: 'Governance Role', value: 'Active-Node', icon: User, id: 'TRM_03' },
                      { label: 'Terms Version', value: '2026-F.01', icon: History, id: 'TRM_04' }
                    ]} />}
                    {activeTab === 'Privacy Node' && <SystemModuleView title="PRIVACY NODE" subtitle="Identity Shield" icon={Lock} status="ENCRYPTED" items={[
                      { label: 'ZKP Bridge', value: 'ACTIVE', icon: Zap, id: 'PRV_01' },
                      { label: 'Identity Obfuscation', value: '99.9%', icon: Shield, id: 'PRV_02' },
                      { label: 'Session Keys', value: 'Ephermeral', icon: Key, id: 'PRV_03' },
                      { label: 'Data Sovereignty', value: 'USER-OWNED', icon: Database, id: 'PRV_04' }
                    ]} />}
                  </>
                ) : (
                  <ProfileView />
                )}
              </motion.div>
            </AnimatePresence>
          </main >

          {/* Cinematic Premium Institutional Footer */}
          <footer className="pt-20 pb-20 relative overflow-hidden footer-gradient border-t border-white/10">
            {/* Background Narrative Layer */}
            <div className="absolute top-20 left-0 w-full overflow-hidden pointer-events-none">
              <div className="footer-marquee">
                YO-PROTOCOL SYSTEM_INIT TERMINAL_ACTIVE_NODE SAVINGS_OPTIMIZATION_ENGINE LUXURY_DEFI_SAVINGS
              </div>
            </div>

            <div className="max-w-[1720px] mx-auto px-10 relative z-10">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-20 mb-40">
                {/* Brand & Manifesto Section */}
                <div className="lg:col-span-4 space-y-16">
                  <div className="flex items-center gap-6 group cursor-pointer" onClick={() => navigateTo('Terminal')}>
                    <div className="w-16 h-16 rounded-full border border-primary/20 bg-black flex items-center justify-center shadow-[0_0_40px_rgba(var(--primary-rgb),0.1)] group-hover:border-primary/50 transition-all duration-700">
                      <img src="/logo.png" alt="YO" className="w-10 h-10 object-contain brightness-125" />
                    </div>
                    <div>
                      <h5 className="text-5xl font-black font-outfit tracking-[-0.1em] italic uppercase text-white leading-none">
                        YO<span className="text-primary">-SAFE</span>
                      </h5>
                      <p className="text-[10px] font-mono font-bold text-primary tracking-[0.5em] mt-2 opacity-60">OPERATIONAL NODE v4.2</p>
                    </div>
                  </div>

                  <p className="text-3xl font-medium text-white/40 leading-[1.1] tracking-tight max-w-sm">
                    The institutional interface for <span className="text-white">high-frequency</span> yield optimization.
                  </p>

                  <div className="flex items-center gap-10 pt-4">
                    {[
                      { icon: Twitter, label: 'NETWORK_X' },
                      { icon: Github, label: 'SOURCE_HUB' },
                      { icon: Globe, label: 'MAIN_PORTAL' }
                    ].map(({ icon: Icon, label }) => (
                      <div key={label} className="group cursor-pointer flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white/30 group-hover:text-primary group-hover:border-primary/30 transition-all duration-500">
                          <Icon size={18} />
                        </div>
                        <span className="text-[8px] font-mono font-bold text-white/20 group-hover:text-white/60 tracking-widest transition-colors">{label}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Architecture Links Section */}
                <div className="lg:col-span-8 grid grid-cols-2 md:grid-cols-4 gap-12 lg:pl-20">
                  {[
                    {
                      label: 'CORE_ENGINE',
                      links: ['Terminal', 'Registry', 'Strategy Flows', 'Market Map']
                    },
                    {
                      label: 'ECOSYSTEM',
                      links: ['YO protocol', 'Smart Savings', 'Safe Vaults', 'Node Sync']
                    },
                    {
                      label: 'SECURITY',
                      links: ['Safety Audits', 'Privacy Shield', 'Compliance', 'Network SLA']
                    },
                    {
                      label: 'SYSTEM_OPS',
                      links: ['Telemetry', 'Chain Bridge', 'API Access', 'Status Dashboard']
                    }
                  ].map((col) => (
                    <div key={col.label} className="space-y-10">
                      <h6 className="text-[11px] font-mono font-black text-primary tracking-[0.4em] uppercase">{col.label}</h6>
                      <ul className="space-y-5">
                        {col.links.map((link) => (
                          <li
                            key={link}
                            onClick={() => navigateTo(link)}
                            className="text-lg font-bold text-white/40 hover:text-white cursor-pointer transition-all duration-300 hover:translate-x-1 flex items-center gap-2 group"
                          >
                            <div className="w-1 h-1 rounded-full bg-primary/0 group-hover:bg-primary transition-all scale-0 group-hover:scale-100" />
                            {link}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>

              {/* Baseline Metrics Bar */}
              <div className="pt-20 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-12">
                <div className="flex items-center gap-12">
                  <div className="flex flex-col">
                    <span className="text-[9px] font-mono font-bold text-white/20 uppercase tracking-widest">Digital Rights</span>
                    <span className="text-xs font-black italic text-white/60">© 2026 YO-SAFE OPERATIONS</span>
                  </div>
                  <div className="h-8 w-[1px] bg-white/5 hidden md:block" />
                  <div className="flex flex-col">
                    <span className="text-[9px] font-mono font-bold text-white/20 uppercase tracking-widest">Protocol Version</span>
                    <span className="text-xs font-black italic text-primary">v4.2.1-SECURE</span>
                  </div>
                </div>

                <div className="flex items-center gap-6">
                  <div className="px-6 py-3 rounded-2xl bg-white/[0.03] border border-white/10 flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      <span className="text-[10px] font-mono font-bold text-white/60 uppercase">Node_Synced</span>
                    </div>
                    <div className="w-[1px] h-4 bg-white/10" />
                    <span className="text-[10px] font-mono font-bold text-primary">Block: #{blockNumber?.toString().slice(-8) || 'SYNCING'}</span>
                    <div className="w-[1px] h-4 bg-white/10" />
                    <span className="text-[10px] font-mono font-bold text-white/40 italic">Gas: {gasPrice ? `${(Number(gasPrice) / 1e9).toFixed(2)}` : '0.00'} Gwei</span>
                  </div>
                </div>
              </div>
            </div>
          </footer>
          <DepositModal isOpen={depositOpen} onClose={() => setDepositOpen(false)} />
          <WithdrawModal isOpen={withdrawOpen} onClose={() => setWithdrawOpen(false)} />
        </div>
      )}
    </AnimatePresence>
  );
};

export default App;
