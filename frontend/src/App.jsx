import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { Blockchain, Block } from './Blockchain';
import './App.css';

const MINER_TOKEN_ADDRESS = "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512";
const SWAP_ADDRESS = "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0";
const BACKGROUND_MINER_PK = "0xdf57089febbacf7ba0bc227dafbffa9fc08a93fdc68e1e42411a14efcf23656e";
const RPC_URL = "http://127.0.0.1:8545";

const MINER_TOKEN_ABI = [
  "function mint(address receiver, uint256 nonce) public",
  "function balanceOf(address account) public view returns (uint256)",
  "function lastBlockHash() public view returns (bytes32)",
  "function difficulty() public view returns (uint256)"
];

const SWAP_ABI = [
  "function swapFor(address user, uint256 amount) public",
  "function rate() public view returns (uint256)"
];

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

  useEffect(() => {
    try {
      const savedBlocks = localStorage.getItem('blockchain_ledger');
      if (savedBlocks) {
        setBlocks(JSON.parse(savedBlocks));
      } else {
        const bc = new Blockchain();
        setBlocks(bc.chain);
      }
      
      if (window.ethereum) {
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
    if (!addr || !window.ethereum) return;
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const tokenContract = new ethers.Contract(MINER_TOKEN_ADDRESS, MINER_TOKEN_ABI, provider);
      const b = await tokenContract.balanceOf(addr);
      const ethB = await provider.getBalance(addr);
      const d = await tokenContract.difficulty();
      const lh = await tokenContract.lastBlockHash();
      
      const mntVal = ethers.formatEther(b);
      setBalance(mntVal);
      setEthBalance(ethers.formatEther(ethB));
      setMinedBlocks(Math.floor(Number(mntVal) / 10));
      setDifficulty(Number(d));
      setLastHash(lh);
      
      // Simulated other balances from local storage or defaults
      setUsdBalance(localStorage.getItem('usd_bal') || "0");
      setBtcBalance(localStorage.getItem('btc_bal') || "0");
      setHistory(JSON.parse(localStorage.getItem('tx_history') || "[]"));
    } catch (err) { console.error(err); }
  };

  const mine = async () => {
    if (!account) return;
    setIsMining(true);
    setStatus({ message: "SHA-256 xeshlash algoritmi ishga tushdi...", type: "info" });
    try {
      const provider = new ethers.JsonRpcProvider(RPC_URL);
      const bgSigner = new ethers.Wallet(BACKGROUND_MINER_PK, provider);
      const tokenContract = new ethers.Contract(MINER_TOKEN_ADDRESS, MINER_TOKEN_ABI, bgSigner);
      
      const lh = await tokenContract.lastBlockHash();
      const diff = Number(await tokenContract.difficulty());
      const targetPrefix = '0'.repeat(diff);
      let nonce = 0;

      const mineInterval = setInterval(async () => {
        for(let i=0; i<300; i++) {
           nonce++;
           const hash = ethers.sha256(ethers.solidityPacked(['bytes32', 'address', 'uint256'], [lh, account, BigInt(nonce)]));
           
           if (i === 0) {
             setCurrentNonce(nonce);
             setCurrentHash(hash);
           }

           if (hash.substring(2, 2 + diff) === targetPrefix) {
             clearInterval(mineInterval);
             setCurrentNonce(nonce);
             setCurrentHash(hash);
             try {
               const tx = await tokenContract.mint(account, nonce);
               await tx.wait();
               
               setStatus({ message: "Yangi blok muvaffaqiyatli minalandi! +10 MNT", type: "success" });
               setIsMining(false);
               
               const newBlock = { 
                 index: blocks.length, 
                 hash, 
                 prevHash: lh,
                 nonce, 
                 reward: "10 MNT",
                 miner: account.substring(0, 8) + "...",
                 timestamp: new Date().toLocaleTimeString() 
               };
               setBlocks(prev => {
                 const updated = [newBlock, ...prev];
                 localStorage.setItem('blockchain_ledger', JSON.stringify(updated));
                 return updated;
               });
               
               setHashrate(Math.floor(nonce / 2));
               setHistory(prev => [{
                 type: "MINING",
                 amount: "+10 MNT",
                 time: new Date().toLocaleTimeString(),
                 status: "Confirmed"
               }, ...prev]);
               await updateBalances(account);
             } catch (e) {
               console.error(e);
               setStatus({ message: "Mining tasdiqlashda xatolik!", type: "warning" });
               setIsMining(false);
             }
             break;
           }
        }
       }, 20);
    } catch (err) { 
      console.error(err); 
      setIsMining(false); 
      setStatus({ message: "Mining tizimida xatolik!", type: "warning" });
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
      if (selectedAsset === "ETH") {
        const bgProvider = new ethers.JsonRpcProvider(RPC_URL);
        const bgSigner = new ethers.Wallet(BACKGROUND_MINER_PK, bgProvider);
        const swapContract = new ethers.Contract(SWAP_ADDRESS, SWAP_ABI, bgSigner);
        const tx = await swapContract.swapFor(account, ethers.parseEther(swapAmount));
        await tx.wait();
      } else {
        // Simulated Swap for other assets
        const amount = Number(swapAmount);
        if (selectedAsset === "USD") {
          const newBal = (Number(usdBalance) + amount * 2.5).toFixed(2);
          setUsdBalance(newBal);
          localStorage.setItem('usd_bal', newBal);
        } else if (selectedAsset === "BTC") {
          const newBal = (Number(btcBalance) + amount * 0.00004).toFixed(6);
          setBtcBalance(newBal);
          localStorage.setItem('btc_bal', newBal);
        }
      }
      setStatus({ message: `Muvaffaqiyatli! ${selectedAsset} hamyoningizga o'tkazildi.`, type: "success" });
      
      const newHistory = [{
        type: "SWAP",
        amount: `-${swapAmount} MNT -> ${selectedAsset}`,
        time: new Date().toLocaleTimeString(),
        status: "Success"
      }, ...history];
      setHistory(newHistory);
      localStorage.setItem('tx_history', JSON.stringify(newHistory));
      
      await updateBalances(account);
    } catch (err) { 
      console.error(err); 
      setStatus({ message: "Swap jarayonida xatolik yuz berdi!", type: "warning" }); 
    }
    setIsProcessing(false);
  };

  const resetAll = () => {
    if (window.confirm("Barcha ma'lumotlar (tarix, balanslar va bloklar) o'chib ketadi. Ishonchingiz komilmi?")) {
      localStorage.clear();
      window.location.reload();
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
             <div className="p-item"><span>ETH:</span> {parseFloat(ethBalance).toFixed(4)}</div>
             <div className="p-item"><span>USD:</span> ${usdBalance}</div>
             <div className="p-item"><span>BTC:</span> {btcBalance}</div>
          </div>
        </div>
        <div className="stat-card">
          <span className="stat-label">MNT Tokenlari</span>
          <div className="stat-value highlight">{balance}</div>
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
              <h3>SHA-256 Mining</h3>
              <p style={{ color: '#94a3b8', marginBottom: '1.5rem' }}>Localhost tarmog'ida Proof-of-Work asosida bloklarni qidirish.</p>
              <button className="btn btn-primary btn-large" onClick={mine} disabled={isMining || isProcessing}>
                {isMining ? "Blok qidirilmoqda..." : "Miningni boshlash"}
              </button>
              {isMining && (
                <div className="live-mining-panel">
                  <div className="mining-anim">
                    <div className="mining-progress"></div>
                  </div>
                  <div className="live-data">
                    <div className="data-item"><span>Nonce:</span> <strong>{currentNonce}</strong></div>
                    <div className="data-item"><span>Hash:</span> <small>{currentHash.substring(0, 32)}...</small></div>
                  </div>
                  <div className="raw-input">
                    <span className="label">Mining Data:</span>
                    <code>sha256({lastHash.substring(0, 8)}... + {account.substring(0, 6)}... + {currentNonce})</code>
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
    </div>
  );
}

export default App;
