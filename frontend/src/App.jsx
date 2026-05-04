import React, { useState, useEffect, useRef } from 'react';
import { ethers } from 'ethers';
import { Blockchain, Block } from './Blockchain';
import './App.css';

import contractConfig from './contract/config.json';
import MINER_TOKEN_ABI from './contract/MinerToken.json';
import SWAP_ABI from './contract/Swap.json';

import USD_ABI from './contract/USD.json';
import BTC_ABI from './contract/BTC.json';

const MINER_TOKEN_ADDRESS = contractConfig.MinerToken;
const SWAP_ADDRESS = contractConfig.Swap;
const USD_ADDRESS = contractConfig.USD;
const BTC_ADDRESS = contractConfig.BTC;
const BACKGROUND_MINER_PK = "0xdf57089febbacf7ba0bc227dafbffa9fc08a93fdc68e1e42411a14efcf23656e";
const RPC_URL = "http://127.0.0.1:8545";


function App() {
  const [account, setAccount] = useState("");
  const [balance, setBalance] = useState("0");
  const [ethBalance, setEthBalance] = useState("0");
  const [minedBlocks, setMinedBlocks] = useState(0);
  const [blocks, setBlocks] = useState([]);
  const [isMining, setIsMining] = useState(false);
  const [swapAmount, setSwapAmount] = useState("10");
  const [status, setStatus] = useState({ message: "", type: "" });
  const [isProcessing, setIsProcessing] = useState(false);
  const [difficulty, setDifficulty] = useState(4);
  const [lastHash, setLastHash] = useState("");
  const [currentNonce, setCurrentNonce] = useState(0);
  const [currentHash, setCurrentHash] = useState("");
  const [usdBalance, setUsdBalance] = useState("0");
  const [btcBalance, setBtcBalance] = useState("0");
  const [selectedAsset, setSelectedAsset] = useState("ETH");
  const [hashrate, setHashrate] = useState(0);
  const [history, setHistory] = useState([]);
  const [toasts, setToasts] = useState([]);

  const [miningPhase, setMiningPhase] = useState("");
  const [miningLogs, setMiningLogs] = useState([]);
  const [mempoolTxs, setMempoolTxs] = useState([
    { hash: "0x1a2b...3c4d", from: "0x45f...12a", to: "0x98b...32c", amount: "1.5 ETH", fee: "0.002 ETH" },
    { hash: "0x9f8e...7d6c", from: "0x112...99f", to: "0x55a...ee1", amount: "0.4 ETH", fee: "0.001 ETH" },
    { hash: "0x4b5c...6d7e", from: "0x334...cca", to: "0x77d...bb2", amount: "5.0 MNT", fee: "0.005 MNT" },
    { hash: "0x8a9b...0c1d", from: "0xabc...def", to: "0x123...456", amount: "12.0 USDT", fee: "0.01 USDT" }
  ]);

  useEffect(() => {
    // Generate new fake transactions into mempool periodically
    const interval = setInterval(() => {
      setMempoolTxs(prev => {
        if (prev.length > 8) return prev; // max 8 txs
        const assets = ["ETH", "MNT", "USDT", "BTC"];
        const asset = assets[Math.floor(Math.random() * assets.length)];
        const amount = (Math.random() * 5).toFixed(2);
        const newTx = {
          hash: "0x" + Math.random().toString(16).slice(2, 10) + "..." + Math.random().toString(16).slice(2, 6),
          from: "0x" + Math.random().toString(16).slice(2, 5) + "..." + Math.random().toString(16).slice(2, 5),
          to: "0x" + Math.random().toString(16).slice(2, 5) + "..." + Math.random().toString(16).slice(2, 5),
          amount: `${amount} ${asset}`,
          fee: `${(amount * 0.001).toFixed(4)} ${asset}`
        };
        return [newTx, ...prev];
      });
    }, 600);
    return () => clearInterval(interval);
  }, []);

  const addLog = (log) => {
    setMiningLogs(prev => {
      const newLogs = [...prev, `[${new Date().toLocaleTimeString()}] ${log}`];
      if (newLogs.length > 50) return newLogs.slice(newLogs.length - 50);
      return newLogs;
    });
  };

  const addToast = (msg, type = "info") => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, msg, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
  };

  const [isWrongNetwork, setIsWrongNetwork] = useState(false);

  const addTokenToMetaMask = async (address, symbol, decimals = 18) => {
    if (!window.ethereum) return;
    try {
      await window.ethereum.request({
        method: 'wallet_watchAsset',
        params: {
          type: 'ERC20',
          options: {
            address,
            symbol,
            decimals,
            image: '',
          },
        },
      });
      addToast(`${symbol} hamyonga qo'shildi!`, "success");
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    const checkNetwork = async () => {
      if (window.ethereum) {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const network = await provider.getNetwork();
        if (Number(network.chainId) !== 31337) {
          setIsWrongNetwork(true);
        } else {
          setIsWrongNetwork(false);
        }
      }
    };

    try {
      const savedBlocks = localStorage.getItem('blockchain_ledger');
      if (savedBlocks) {
        setBlocks(JSON.parse(savedBlocks));
      } else {
        const bc = new Blockchain();
        setBlocks(bc.chain);
      }
      
      if (window.ethereum) {
        checkNetwork();
        window.ethereum.on('accountsChanged', (accounts) => {
          if (accounts.length > 0) { setAccount(accounts[0]); updateBalances(accounts[0]); }
          else setAccount("");
        });
        window.ethereum.on('chainChanged', () => window.location.reload());
        window.ethereum.request({ method: 'eth_accounts' }).then(accounts => {
          if (accounts.length > 0) { setAccount(accounts[0]); updateBalances(accounts[0]); }
        });
      }
    } catch (err) { console.error(err); }
  }, []);


  const updateBalances = async (addr) => {
    if (!addr) return;
    try {
      const provider = new ethers.JsonRpcProvider(RPC_URL);
      const mntContract = new ethers.Contract(MINER_TOKEN_ADDRESS, MINER_TOKEN_ABI, provider);
      const usdContract = new ethers.Contract(USD_ADDRESS, USD_ABI, provider);
      const btcContract = new ethers.Contract(BTC_ADDRESS, BTC_ABI, provider);
      
      const b = await mntContract.balanceOf(addr);
      const ethB = await provider.getBalance(addr);
      const usdB = await usdContract.balanceOf(addr);
      const btcB = await btcContract.balanceOf(addr);
      const d = await mntContract.difficulty();
      
      const mntVal = ethers.formatEther(b);
      setBalance(mntVal);
      setEthBalance(ethers.formatEther(ethB));
      setUsdBalance(ethers.formatEther(usdB));
      setBtcBalance(ethers.formatEther(btcB));
      setMinedBlocks(Math.floor(Number(mntVal) / 10));
      setDifficulty(Number(d));
      
      const lh = await mntContract.lastBlockHash();
      setLastHash(lh);
      setHistory(JSON.parse(localStorage.getItem('tx_history') || "[]"));
    } catch (err) { console.error("Balance update error:", err); }
  };

  const delay = (ms) => new Promise(res => setTimeout(res, ms));

  const isMiningRef = useRef(false);
  const cycleIdRef = useRef(0);

  const toggleMining = () => {
    if (isMiningRef.current) {
      isMiningRef.current = false;
      setIsMining(false);
      setMiningPhase("Mayning to'xtatildi.");
      setStatus({ message: "Mayning to'xtatildi.", type: "warning" });
    } else {
      isMiningRef.current = true;
      cycleIdRef.current += 1;
      setIsMining(true);
      setMiningLogs([]);
      startMiningCycle(cycleIdRef.current);
    }
  };

  const startMiningCycle = async (cycleId) => {
    if (!account || !isMiningRef.current || cycleId !== cycleIdRef.current) return;
    
    setCurrentNonce(0);
    setCurrentHash("");
    
    try {
      setStatus({ message: "Mayning jarayoni ishga tushdi...", type: "info" });
      setMiningPhase("Tizim ishga tushirilmoqda...");
      addLog("Miner v1.0.0 started new cycle");
      addLog("Connecting to blockchain network on localhost:8545... OK");

      const provider = new ethers.JsonRpcProvider(RPC_URL);
      const bgSigner = new ethers.Wallet(BACKGROUND_MINER_PK, provider);
      const tokenContract = new ethers.Contract(MINER_TOKEN_ADDRESS, MINER_TOKEN_ABI, bgSigner);
      
      const lh = await tokenContract.lastBlockHash();
      const diff = Number(await tokenContract.difficulty());
      const targetPrefix = '0'.repeat(diff);
      
      addLog(`Network target difficulty: ${diff} (${targetPrefix}...)`);
      addLog(`Previous Block Hash: ${lh.substring(0, 16)}...`);
      
      setMiningPhase("Mempool'dan tranzaksiyalar yig'ilmoqda...");
      addLog("Fetching pending transactions from Mempool...");
      await delay(100);
      const txCount = mempoolTxs.length;
      addLog(`Gathered ${txCount} transactions from Mempool. Total size: ${(txCount * 0.25).toFixed(2)} KB.`);
      setMempoolTxs([]); // Clear mempool as we pack them into block
      
      setMiningPhase("Tranzaksiyalar tekshirilmoqda...");
      addLog(`Verifying digital signatures and balances for ${txCount} transactions...`);
      await delay(50);
      addLog("All transactions verified successfully. Invalid transactions dropped: 0");

      setMiningPhase("Merkle Root hisoblanmoqda...");
      addLog("Calculating Merkle Root for verified transaction tree...");
      await delay(50);
      const fakeMerkleRoot = ethers.sha256(ethers.toUtf8Bytes(Date.now().toString()));
      addLog(`Merkle Root calculated: ${fakeMerkleRoot.substring(0, 16)}...`);
      
      setMiningPhase("Yangi blok shabloni (Block Template) yaratilmoqda...");
      addLog("Constructing Block Header: [Version, PrevHash, MerkleRoot, Timestamp, Target, Nonce]");
      await delay(50);
      
      setMiningPhase("SHA-256 Proof-of-Work xeshlash boshlandi...");
      setStatus({ message: "SHA-256 xeshlash algoritmi ishlamoqda...", type: "info" });
      addLog("Starting hashing engine... Threads: 1 (Browser JS)");

      let nonce = 0;
      const startTime = Date.now();

      const mineLoop = async () => {
        if (!isMiningRef.current || cycleId !== cycleIdRef.current) return;
        
        // Lower batch size to 500 to prevent UI freezing
        for(let i=0; i<500; i++) {
           nonce++;
           const hash = ethers.sha256(ethers.solidityPacked(['bytes32', 'address', 'uint256'], [lh, account, BigInt(nonce)]));
           
           if (i === 0) {
             setCurrentNonce(nonce);
             setCurrentHash(hash);
           }
           
           if (nonce % 1000 === 0) {
             const elapsed = (Date.now() - startTime) / 1000;
             const hr = Math.floor(nonce / Math.max(elapsed, 0.001));
             addLog(`Hash: ${hash.substring(0, 24)}... | Nonce: ${nonce} | ${hr} H/s`);
           }

           if (hash.substring(2, 2 + diff) === targetPrefix) {
             setCurrentNonce(nonce);
             setCurrentHash(hash);
             addLog(`!!! VALID BLOCK FOUND !!!`);
             addLog(`Hash matches target prefix: ${targetPrefix}`);
             addLog(`Final Hash: ${hash}`);
             addLog(`Winning Nonce: ${nonce}`);
             
             try {
               setMiningPhase("Tarmoq tugunlari (Nodes) blokni tekshirmoqda...");
               setStatus({ message: "Blok topildi! Tarmoqqa uzatilmoqda...", type: "info" });
               addLog("Broadcasting Block to global P2P network...");
               await delay(50);
               addLog("Peer nodes verifying Proof-of-Work and Merkle Root...");
               await delay(50);
               addLog("Consensus reached: Block is VALID. 51%+ nodes approved.");
               
               setMiningPhase("Tranzaksiyalar zanjirga yozilmoqda...");
               addLog("Executing block transactions and updating ledger states...");
               await delay(50);
               addLog("Transaction states permanently committed to the blockchain.");
               
               addLog("Generating Coinbase Transaction (Miner Reward)...");
               const tx = await tokenContract.mint(account, nonce);
               
               setMiningPhase("Tarmoq tasdig'i (Confirmation)...");
               await tx.wait();
               
               addLog("Block successfully appended to the longest chain!");
               addLog("Reward of 10 MNT deposited to miner address.");
               
               setMiningPhase("Blok muvaffaqiyatli qabul qilindi!");
               addToast("Yangi blok mayning qilindi! +10 MNT", "success");
               setIsMining(false);
               setMiningPhase("");
               
               setBlocks(prev => {
                 const newBlock = { 
                   index: prev.length, 
                   hash, 
                   prevHash: lh,
                   nonce, 
                   reward: "10 MNT",
                   miner: account.substring(0, 8) + "...",
                   timestamp: new Date().toLocaleTimeString() 
                 };
                 const updated = [newBlock, ...prev];
                 localStorage.setItem('blockchain_ledger', JSON.stringify(updated));
                 return updated;
               });
               
               const elapsed = (Date.now() - startTime) / 1000;
               setHashrate(Math.floor(nonce / Math.max(elapsed, 0.001)));
               
               setHistory(prev => [{
                 type: "MINE",
                 amount: "+10 MNT",
                 time: new Date().toLocaleTimeString(),
                 status: "Confirmed"
               }, ...prev]);
               await updateBalances(account);
               
               if (isMiningRef.current && cycleId === cycleIdRef.current) {
                 addLog("Starting next block cycle in 0.5 seconds...");
                 setTimeout(() => startMiningCycle(cycleId), 500);
               }
             } catch (e) {
               console.error(e);
               addLog("ERROR: Block rejected by network or failed to confirm!");
               addToast("Mayning tasdiqlashda xatolik yuz berdi!", "warning");
               if (isMiningRef.current && cycleId === cycleIdRef.current) {
                 setTimeout(() => startMiningCycle(cycleId), 2000);
               }
             }
             return;
           }
        }
        if (isMiningRef.current && cycleId === cycleIdRef.current) {
          setTimeout(mineLoop, 0);
        } else {
          addLog("Hashing engine stopped by user.");
        }
      };
      mineLoop();
    } catch (err) { 
      console.error(err); 
      addLog("CRITICAL ERROR in mining engine.");
      if (isMiningRef.current && cycleId === cycleIdRef.current) {
        setTimeout(() => startMiningCycle(cycleId), 5000);
      }
    }
  };

  const handleSwap = async () => {
    if (!account || isProcessing) return;
    if (Number(balance) < Number(swapAmount)) {
      setStatus({ message: "Balansda yetarli MNT mavjud emas!", type: "warning" });
      return;
    }
    setIsProcessing(true);
    setStatus({ message: "MNT -> ETH konvertatsiya qilinmoqda...", type: "info" });
    try {
      const amount = Number(swapAmount);
      const bgProvider = new ethers.JsonRpcProvider(RPC_URL);
      const bgSigner = new ethers.Wallet(BACKGROUND_MINER_PK, bgProvider);
      const swapContract = new ethers.Contract(SWAP_ADDRESS, SWAP_ABI, bgSigner);

      if (selectedAsset === "ETH") {
        const tx = await swapContract.swapFor(account, ethers.parseEther(swapAmount));
        await tx.wait();
      } else {
        const tx = await swapContract.swapForAsset(account, ethers.parseEther(swapAmount), selectedAsset);
        await tx.wait();
      }
      
      addToast(`Muvaffaqiyatli! ${selectedAsset} hamyoningizga o'tkazildi.`, "success");

      
      const newHistory = [{
        type: "SWAP",
        amount: `-${swapAmount} MNT -> ${selectedAsset}`,
        time: new Date().toLocaleTimeString(),
        status: "Success"
      }, ...history];
      setHistory(newHistory);
      localStorage.setItem('tx_history', JSON.stringify(newHistory));
      
      setTimeout(() => updateBalances(account), 1000);
    } catch (err) { 
      console.error(err); 
      setStatus({ message: "Swap jarayonida xatolik yuz berdi! (Yetarli ETH yoki MNT yo'q)", type: "warning" }); 
    }

    setIsProcessing(false);
  };

  const resetAll = () => {
    if (window.confirm("Barcha ma'lumotlar (tarix, balanslar, USD va BTC) o'chib ketadi. Ishonchingiz komilmi?")) {
      localStorage.clear();
      setUsdBalance("0");
      setBtcBalance("0");
      setHistory([]);
      setBlocks([]);
      setBalance("0");
      setStatus({ message: "Barcha ma'lumotlar tozalandi! (Blokcheyn balanslaridan tashqari)", type: "info" });
      setTimeout(() => window.location.reload(), 1500);
    }
  };


  return (
    <div className="container">
      <header>
        <h1>PoW Miner Ecosystem</h1>
        <p className="subtitle">Muvaffaqiyatli bloklarni minalang va mukofotlarni ETH-ga almashtiring</p>
      </header>

      <div className="stats-container">
        <div className="stat-card">
          <span className="stat-label">Hamyon Portfeli</span>
          <div className="portfolio-grid">
             <div className="p-item">
               <span>ETH:</span> {parseFloat(ethBalance).toFixed(4)}
             </div>
             <div className="p-item">
               <span>USD:</span> ${parseFloat(usdBalance).toFixed(2)}
               <button className="btn-mini" onClick={() => addTokenToMetaMask(USD_ADDRESS, "USDT")}>🦊</button>
             </div>
             <div className="p-item">
               <span>BTC:</span> {parseFloat(btcBalance).toFixed(6)}
               <button className="btn-mini" onClick={() => addTokenToMetaMask(BTC_ADDRESS, "WBTC")}>🦊</button>
             </div>

          </div>
        </div>
        <div className="stat-card">
          <span className="stat-label">MNT Tokenlari</span>
          <div className="stat-value highlight">
            {balance}
            <button className="btn-mini" onClick={() => addTokenToMetaMask(MINER_TOKEN_ADDRESS, "MNT")} style={{marginLeft: '10px', fontSize: '1rem'}}>🦊</button>
          </div>
        </div>

        <div className="stat-card">
          <span className="stat-label">Hashrate (Sim)</span>
          <div className="stat-value">{isMining ? (currentNonce / 10).toFixed(0) : hashrate} H/s</div>
        </div>
      </div>

      <div style={{ textAlign: 'right', marginBottom: '1rem' }}>
        <button className="btn-link" onClick={resetAll} style={{color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.9rem', fontWeight: 'bold'}}>
          🗑️ Hammasini Tozalash (Reset)
        </button>
      </div>

      <div className="mempool-section card" style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.2rem', marginBottom: '1rem', borderBottom: '1px solid #334155', paddingBottom: '0.5rem' }}>⏳ Mempool (Kutayotgan Tranzaksiyalar)</h2>
        <div className="mempool-list" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {mempoolTxs.length === 0 ? <p style={{color: '#64748b'}}>Mempool bo'sh. Yangi tranzaksiyalar kutilmoqda...</p> : (
            mempoolTxs.map((tx, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', background: '#0f172a', padding: '0.8rem', borderRadius: '6px', fontSize: '0.85rem', borderLeft: '3px solid #f59e0b' }}>
                <div><span style={{color: '#94a3b8'}}>Hash:</span> <span style={{color: '#38bdf8'}}>{tx.hash}</span></div>
                <div><span style={{color: '#94a3b8'}}>Amount:</span> <strong style={{color: '#10b981'}}>{tx.amount}</strong></div>
                <div><span style={{color: '#94a3b8'}}>Fee:</span> <span>{tx.fee}</span></div>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="main-actions">
        {!account ? (
          <div style={{ textAlign: 'center' }}>
            <button className="btn btn-primary btn-large" onClick={() => {
              window.ethereum.request({ method: 'eth_requestAccounts' }).then(accs => {
                setAccount(accs[0]);
                updateBalances(accs[0]);
              });
            }}>MetaMask-ni ulash</button>
          </div>
        ) : (
          <div className="action-grid">
            <div className="action-box">
              <h3>SHA-256 Mayning</h3>
              <p style={{ color: '#94a3b8', marginBottom: '1.5rem' }}>Localhost tarmog'ida Proof-of-Work asosida uzluksiz bloklarni qidirish.</p>
              <button className={`btn ${isMining ? 'btn-secondary' : 'btn-primary'} btn-large`} onClick={toggleMining} disabled={isProcessing}>
                {isMining ? "Mayningni to'xtatish" : "Mayningni boshlash"}
              </button>
              {isMining && (
                <div className="live-mining-panel">
                  <div className="mining-anim">
                    <div className="mining-progress"></div>
                  </div>
                  {miningPhase && (
                    <div className="mining-phase" style={{ color: '#38bdf8', marginBottom: '10px', fontSize: '0.9rem', fontWeight: 'bold' }}>
                      ⚙️ {miningPhase}
                    </div>
                  )}
                  <div className="live-data">
                    <div className="data-item"><span>Nonce:</span> <strong>{currentNonce}</strong></div>
                    <div className="data-item"><span>Hash:</span> <small>{currentHash.substring(0, 32)}...</small></div>
                  </div>
                  <div className="raw-input">
                    <span className="label">Mayning Data:</span>
                    <code>sha256({lastHash.substring(0, 8)}... + {account.substring(0, 6)}... + {currentNonce})</code>
                  </div>
                  
                  <div className="terminal-logs" style={{ background: '#0f172a', padding: '10px', borderRadius: '8px', marginTop: '15px', height: '180px', overflowY: 'auto', fontFamily: 'monospace', fontSize: '0.8rem', color: '#34d399', textAlign: 'left', display: 'flex', flexDirection: 'column-reverse', border: '1px solid #1e293b' }}>
                     {miningLogs.slice().reverse().map((log, i) => (
                       <div key={i}>{log}</div>
                     ))}
                  </div>
                </div>
              )}
            </div>
            <div className="action-box">
              <h3>Instant Multi-Swap</h3>
              <p style={{ color: '#94a3b8', marginBottom: '1.5rem' }}>MNT tokenlarini turli xil aktivlarga real vaqtda almashtiring.</p>
              <div className="input-group">
                <div className="asset-selector">
                  {["ETH", "USD", "BTC"].map(asset => (
                    <button 
                      key={asset} 
                      className={`asset-btn ${selectedAsset === asset ? 'active' : ''}`}
                      onClick={() => setSelectedAsset(asset)}
                    >
                      {asset}
                    </button>
                  ))}
                </div>
                <input type="number" value={swapAmount} onChange={(e) => setSwapAmount(e.target.value)} />
                <div className="swap-preview">
                  <div className="preview-row">
                    <span>Kurs:</span>
                    <strong>
                      {selectedAsset === "ETH" ? "100 MNT = 1 ETH" : 
                       selectedAsset === "USD" ? "1 MNT = 2.5 USD" : 
                       "1 MNT = 0.00004 BTC"}
                    </strong>
                  </div>
                  <div className="preview-row result">
                    <span>Siz olasiz:</span>
                    <strong style={{color: '#34d399'}}>
                      {selectedAsset === "ETH" ? (Number(swapAmount) / 100).toFixed(4) : 
                       selectedAsset === "USD" ? (Number(swapAmount) * 2.5).toFixed(2) : 
                       (Number(swapAmount) * 0.00004).toFixed(6)} {selectedAsset}
                    </strong>
                  </div>
                </div>
                <button className="btn btn-secondary btn-large" onClick={handleSwap} disabled={isMining || isProcessing}>
                  {isProcessing ? "Bajarilmoqda..." : "Almashtirish"}
                </button>
              </div>
            </div>
          </div>
        )}
        {isWrongNetwork && (
          <div className="status-message status-warning" style={{marginTop: '1rem', textAlign: 'center'}}>
            ⚠️ MetaMask noto'g'ri tarmoqda! Iltimos, <strong>Localhost 8545</strong> (Chain ID: 31337) tarmog'iga o'ting.
          </div>
        )}
        {status.message && <div className={`status-message status-${status.type}`}>{status.message}</div>}

      </div>

      <div className="history-section card">
        <h2>📜 Amallar Tarixi</h2>
        <div className="history-table">
          {history.length === 0 ? <p style={{textAlign: 'center', color: '#64748b'}}>Hali amallar bajarilmagan</p> : (
            history.map((tx, i) => (
              <div key={i} className="history-item">
                <div className="tx-icon">{tx.type === "MINING" ? "⛏️" : "🔄"}</div>
                <div className="tx-details">
                  <span className="tx-type">{tx.type}</span>
                  <span className="tx-time">{tx.time}</span>
                </div>
                <div className="tx-amount" style={{color: tx.type === "MINING" ? "#34d399" : "#fbbf24"}}>
                  {tx.amount}
                </div>
                <div className="tx-status">{tx.status}</div>
              </div>
            ))
          )}
        </div>
      </div>

      <section className="blockchain-section">
        <h2>🔗 Immutable Blockchain Ledger</h2>
        <div className="blockchain-list">
          {blocks.map((block, i) => (
            <div key={i} className="block-wrapper">
              {i !== 0 && <div className="block-connector"></div>}
              <div className="block-item">
                <div className="block-header">
                  <span className="block-number">Block #{block.index}</span>
                  <span className="block-time">{block.timestamp}</span>
                </div>
                <div className="block-body">
                  <div className="data-row">
                    <span className="label">Current Hash (SHA-256)</span>
                    <span className="value-mono">{block.hash}</span>
                  </div>
                  <div className="data-row">
                    <span className="label">Previous Hash</span>
                    <span className="value-mono">{block.prevHash || "0000...0000 (Genesis)"}</span>
                  </div>
                  <div className="data-row">
                    <span className="label">Proof (Nonce)</span>
                    <span className="value-mono">{block.nonce}</span>
                  </div>
                  <div className="data-row">
                    <span className="label">Block Reward</span>
                    <span className="value-mono" style={{color: '#34d399'}}>{block.reward}</span>
                  </div>
                  <div className="data-row">
                    <span className="label">Miner</span>
                    <span className="value-mono">{block.miner}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
      <div className="toast-container">
        {toasts.map(t => (
          <div key={t.id} className={`toast toast-${t.type}`}>{t.msg}</div>
        ))}
      </div>
    </div>
  );
}


export default App;
