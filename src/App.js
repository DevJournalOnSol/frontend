import { WalletAdapterNetwork } from "@solana/wallet-adapter-base";
import {
  ConnectionProvider,
  useWallet,
  useConnection,
  useAnchorWallet,
  WalletProvider,
} from "@solana/wallet-adapter-react";
import {
  WalletModalProvider,
  WalletMultiButton,
} from "@solana/wallet-adapter-react-ui";
import * as anchor from "@coral-xyz/anchor";
import { useMemo, useState, useEffect } from "react";
import "./App.css";
import "@solana/wallet-adapter-react-ui/styles.css";
import {
  clusterApiUrl,
  PublicKey,
  Transaction,
  Keypair,
  SystemProgram,
  NonceAccount,
  sendAndConfirmRawTransaction,
  LAMPORTS_PER_SOL,
  NONCE_ACCOUNT_LENGTH,
} from "@solana/web3.js";
import { createClient } from "@supabase/supabase-js";
import React from "react";
import idl from "./idl.json";
import * as bs58 from "bs58";
import { v4 as uuidv4 } from "uuid";

const programID = new PublicKey("7Hz71HGc5M44c7Q7qAtneeKgh8LbSjLHaw45fy4N2WNQ");
const network = `https://rpc-devnet.helius.xyz/?api-key=${process.env.REACT_APP_HELIUS_API}`;
const opts = {
  preflightCommitment: "processed",
};
const supabase = createClient(
  "https://nieyqkpklufvtaezmaze.supabase.co",
  process.env.REACT_APP_SUPABASE_KEY
);

const nonceAuthKP = Keypair.fromSecretKey(
  bs58.decode(process.env.REACT_APP_AUTH_KEYPAIR)
);

export const truncateStr = (str, n = 6) => {
  if (!str) return "";
  return str.length > n
    ? str.substr(0, n - 1) + "..." + str.substr(str.length - n, str.length - 1)
    : str;
};

export const formatTimeAgo = (dateString) => {
  const date = new Date(dateString);
  const now = new Date();

  const diff = date - now; // Get the time difference in milliseconds

  let seconds = Math.floor(Math.abs(diff) / 1000);

  let text = "";

  console.log(seconds, " ", seconds % 3600);

  if (seconds < 86400) {
    const hours = Math.floor(seconds / 3600);
    text += `${hours} hour${hours !== 1 ? "s" : ""} `;
    seconds = seconds % 3600;
  }
  if (seconds < 3600) {
    const minutes = Math.floor(seconds / 60);
    text += `${minutes} minute${minutes !== 1 ? "s" : ""} `;
    seconds = seconds % 60;
  } else if (seconds < 60) {
    text += `${seconds} second${seconds !== 1 ? "s" : ""} `;
  }
  // else {
  //   const days = Math.floor(seconds / 86400);
  //   text = `${days} day${days !== 1 ? "s" : ""} ${
  //     diff > 0 ? "from now" : "ago"
  //   }`;
  // }

  return text + " ago";
};

export const getProvider = (wallet) => {
  /* create the provider and return it to the caller */
  /* network set to local network for now */

  const connection = new anchor.web3.Connection(
    network,
    opts.preflightCommitment
  );

  const provider = new anchor.AnchorProvider(
    connection,
    wallet,
    opts.preflightCommitment
  );
  return provider;
};

export const getProgram = (wallet) => {
  const provider = getProvider(wallet);
  const program = new anchor.Program(idl, programID, provider);

  return program;
};

const Context = ({ children }) => {
  const network = WalletAdapterNetwork.Devnet;
  const endpoint = useMemo(() => clusterApiUrl(network), [network]);
  const wallets = useMemo(() => [], []);

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>{children}</WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
};

const Content = () => {
  const { publicKey, signTransaction } = useWallet();
  const { connection } = useConnection();
  const [journalText, setJournalText] = useState("");
  const [journalNoncePubKeys, setJournalNoncePubKey] = useState("");
  const [journalNonces, setJournalNonce] = useState("");
  const [poll, setPoll] = useState(
    new PublicKey("XqGh8zNk3NouFUrucwFDRLt7dTorFm74z1PDVHokdTC")
  );
  const [enteredAddress, setEnteredAddress] = useState("");
  const [enteredNumber, setEnteredNumber] = useState(1);
  const [noncePubKeys, setNoncePubKeys] = useState([]);
  const [nonces, setNonces] = useState([]);
  const [votes, setVotes] = useState({
    solana: 0,
    ethereum: 0,
    polygon: 0,
  });
  const [posts, setPosts] = useState();
  const wallet = useAnchorWallet();
  const program = getProgram(wallet);
  console.log(`Poll program: ${program.programId}`);
  console.log(`Connected wallet: ${wallet?.publicKey}`);
  console.log(`Poll account: ${poll}`);
  console.log(
    `Current poll status: Ethereum=${votes.ethereum} | Solana=${votes.solana} | Polygon=${votes.polygon}`
  );
  console.log(``);

  let date = new Date();

  let day = date.getDate();
  let month = date.getMonth() + 1;
  let year = date.getFullYear();
  let years = Math.round(date / year);
  // date = date.toISOString();
  console.log(Date.parse(date));
  console.log(`${day}-${month}-${year}`);

  const fetchPoll = async (pollId) => {
    if (!poll) {
      // return alert("Connect your wallet first.");
    }
    const poll = new PublicKey(pollId);
    const pollAccount = await program.account.feed.fetch(poll);
    console.log(pollAccount);
    // setVotes({
    //   ethereum: parseInt(pollAccount.ethereum.toString()),
    //   solana: parseInt(pollAccount.solana.toString()),
    //   polygon: parseInt(pollAccount.polygon.toString()),
    // });
    // setPoll(new PublicKey(pollId));
  };

  // fetchPoll();

  useEffect(() => {
    const onPageLoad = async () => {
      try {
        let posts = await program.account.post.all();
        setPosts(posts);
        console.log(posts);
      } catch (error) {
        console.error("Error occurred:", error);
      }
    };

    onPageLoad(); // Call the inline async function immediately on mount

    // If you need cleanup logic, you can return a cleanup function
    return () => {
      // Cleanup code here (if needed)
    };
  }, [poll]);

  const submitJournalEntry = async (text) => {
    const entryNonceKeypair = Keypair.generate();

    const tx = new Transaction();
    tx.feePayer = nonceAuthKP.publicKey;
    tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
    tx.add(
      SystemProgram.createAccount({
        fromPubkey: nonceAuthKP.publicKey,
        newAccountPubkey: entryNonceKeypair.publicKey,
        lamports: 0.0015 * LAMPORTS_PER_SOL,
        space: NONCE_ACCOUNT_LENGTH,
        programId: SystemProgram.programId,
      }),
      SystemProgram.nonceInitialize({
        noncePubkey: entryNonceKeypair.publicKey,
        authorizedPubkey: nonceAuthKP.publicKey,
      })
    );

    tx.sign(entryNonceKeypair, nonceAuthKP);
    const sig = await sendAndConfirmRawTransaction(
      connection,
      tx.serialize({ requireAllSignatures: false })
    );
    console.log("Nonces initiated: ", sig);

    console.log(entryNonceKeypair.publicKey.toString());
    let accountInfo = await connection.getAccountInfo(
      entryNonceKeypair.publicKey
    );
    const nonceAccount = NonceAccount.fromAccountData(accountInfo.data);
    setJournalNoncePubKey(entryNonceKeypair);
    setJournalNonce(nonceAccount);

    const nonce = nonces.pop();
    const noncePubKey = noncePubKeys.pop();
    setNonces(nonces);
    setNoncePubKeys(noncePubKeys);
    const newPost = anchor.web3.Keypair.generate();
    const ix = program.instruction.write(journalText, {
      accounts: {
        feed: "XqGh8zNk3NouFUrucwFDRLt7dTorFm74z1PDVHokdTC",
        user: wallet.publicKey,
        clock: Date.now(),
        post: newPost,
        // rent: "SysvarRent111111111111111111111111111111111"
      },
    });

    const advanceIX = SystemProgram.nonceAdvance({
      authorizedPubkey: nonceAuthKP.publicKey,
      noncePubkey: noncePubKey,
    });
    const jtx = new Transaction();
    jtx.add(advanceIX);
    jtx.add(ix);

    jtx.recentBlockhash = nonce;
    jtx.feePayer = publicKey;
    jtx.sign(nonceAuthKP);
    const signedtx = await signTransaction(tx);
    const ser = bs58.encode(
      signedtx.serialize({ requireAllSignatures: false })
    );
    console.log("signed!");

    const row = {
      id: uuidv4(),
      transaction: ser,
      publicKey: publicKey,
      pollId: poll,
    };
    console.log("MFUC", row);
    const { error } = await supabase.from("durableTransactions").insert(row);

    if (error) {
      console.log(error);
    } else {
      console.log(`inserted row to supabase: ${row}`);
    }
  };

  const createNonces = async (num) => {
    const nonceKeypairs = [];
    for (var i = 0; i < num; i++) {
      nonceKeypairs.push(Keypair.generate());
    }
    const tx = new Transaction();
    tx.feePayer = nonceAuthKP.publicKey;
    tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
    for (var j = 0; j < num; j++) {
      tx.add(
        SystemProgram.createAccount({
          fromPubkey: nonceAuthKP.publicKey,
          newAccountPubkey: nonceKeypairs[j].publicKey,
          lamports: 0.0015 * LAMPORTS_PER_SOL,
          space: NONCE_ACCOUNT_LENGTH,
          programId: SystemProgram.programId,
        }),
        SystemProgram.nonceInitialize({
          noncePubkey: nonceKeypairs[j].publicKey,
          authorizedPubkey: nonceAuthKP.publicKey,
        })
      );
    }
    tx.sign(...nonceKeypairs, nonceAuthKP);
    const sig = await sendAndConfirmRawTransaction(
      connection,
      tx.serialize({ requireAllSignatures: false })
    );
    console.log("Nonces initiated: ", sig);

    const nonceAccounts = [];
    for (var k = 0; k < num; k++) {
      console.log(nonceKeypairs[k].publicKey.toString());
      let accountInfo = await connection.getAccountInfo(
        nonceKeypairs[k].publicKey
      );
      nonceAccounts.push(NonceAccount.fromAccountData(accountInfo.data));
    }
    setNoncePubKeys(nonceKeypairs.map((kp) => kp.publicKey));
    setNonces(nonceAccounts.map((acc) => acc.nonce));
    alert(`${num} nonces prepared, lets get started!`);
  };

  const createPoll = async () => {
    if (!wallet) {
      return alert("Connect your wallet first.");
    }

    const newPoll = anchor.web3.Keypair.generate();

    await program.methods
      .create()
      .accounts({
        poll: newPoll.publicKey,
        user: wallet.publicKey,
      })
      .signers([newPoll])
      .rpc();
    setPoll(newPoll.publicKey);
  };

  const vote = async (candidate) => {
    if (nonces.length === 0) {
      return alert("No more nonces left, create some.");
    }
    if (!wallet) {
      return alert("Connect your wallet first.");
    } else if (!poll) {
      return alert("Create a new poll first.");
    }

    const nonce = nonces.pop();
    const noncePubKey = noncePubKeys.pop();
    setNonces(nonces);
    setNoncePubKeys(noncePubKeys);

    let vote = "";
    if (candidate === 0) {
      vote = "eth";
    } else if (candidate === 1) {
      vote = "sol";
    } else if (candidate === 2) {
      vote = "pol";
    }
    const ix = program.instruction.vote(vote, {
      accounts: {
        poll: poll,
        user: wallet.publicKey,
      },
    });
    const advanceIX = SystemProgram.nonceAdvance({
      authorizedPubkey: nonceAuthKP.publicKey,
      noncePubkey: noncePubKey,
    });
    const tx = new Transaction();
    tx.add(advanceIX);
    tx.add(ix);

    tx.recentBlockhash = nonce;
    tx.feePayer = publicKey;
    tx.sign(nonceAuthKP);
    const signedtx = await signTransaction(tx);
    const ser = bs58.encode(
      signedtx.serialize({ requireAllSignatures: false })
    );
    console.log("signed!");

    const row = {
      id: uuidv4(),
      transaction: ser,
      publicKey: publicKey,
      pollId: poll,
    };
    console.log("MFUC", row);
    const { error } = await supabase.from("durableTransactions").insert(row);

    if (error) {
      console.log(error);
    } else {
      console.log(`inserted row to supabase: ${row}`);
    }
  };

  const countVotes = async () => {
    const pollCount = await program.account.poll.fetch(poll);
    setVotes({
      ethereum: parseInt(pollCount.ethereum.toString()),
      solana: parseInt(pollCount.solana.toString()),
      polygon: parseInt(pollCount.polygon.toString()),
    });
    console.log(votes);
  };

  return (
    <div className="App bg-[#30363c] w-view min-h-screen h-full text-gray-200 ">
      <div className="fixed w-screen bg-[#1c1f22] h-16 flex justify-between items-center px-6">
        <div className="font-extrabold text-2xl">DevJournal</div>
        <WalletMultiButton />
      </div>
      {publicKey ? (
        <div className="flex flex-col justify-between min-h-screen h-full">
          <div className="pt-20 flex-col h-full justify-evenly items-center">
            <h1 className="mb-6">
              <div className="font-bold text-2xl">Daily Feed</div>{" "}
              {`${day}-${month}-${year}`}
            </h1>
            {/* <Post
              text="Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's standard dummy text ever since the 1500s, when an unknown printer took a galley of type and scrambled it to make a type specimen book. It has survived not only five centuries, but also the leap "
              address="3K56PpbyXHXz6iiVkUhbGKBaa9HWvUnfjbkYdZFHSXeX"
              timestamp="1691015860"
            /> */}
            <div className="flex flex-col gap-4">
              {!posts
                ? ""
                : posts.map((i) => (
                    <Post
                      text={i.account.content}
                      address={i.account.owner.toString()}
                      timestamp={i.account.time.toString()}
                    />
                  ))}
            </div>

            {/*<h3>Enter the Poll address or create a new one</h3>
          <input
            type="text"
            value={enteredAddress}
            onChange={(event) => setEnteredAddress(event.target.value)}
          /> */}
            {/* <button onClick={() => fetchPoll(enteredAddress)}>
            Fetch Old Poll
          </button>
          <button onClick={() => createPoll()}>Create New Poll</button>
          <button onClick={() => createNonces(enteredNumber)}>
            Create Nonces
          </button> */}
            {/* <h3>Vote for your favorite blockchain</h3>
          <button onClick={() => vote(0)}>Vote Ethereum</button>
          <button onClick={() => vote(1)}>Vote Solana</button>
          <button onClick={() => vote(2)}>Vote Polygon</button> */}
            {/* <h3>Wallet Address</h3> */}
            {/* <p>{publicKey.toString()}</p> */}
            {/* <h3>Poll Address</h3> */}
            {/* <p>{poll ? poll.toString() : ""}</p> */}

            {/* <h2>
            Ethereum: {votes.ethereum} | Solana: {votes.solana} | Polygon:{" "}
            {votes.polygon}
          </h2> */}
          </div>

          <div className="my-20 flex flex-col w-2/5 mx-auto">
            <div className="font-bold text-2xl mb-6">
              Share what you are building on today!
            </div>
            <textarea
              className="bg-[#30323a] rounded-md border"
              type="text"
              value={journalText}
              onChange={(event) => setJournalText(event.target.value)}
            />
            <button
              className="bg-[#1c1d22] hover:bg-[#1c1d22]/50 rounded my-6"
              onClick={() => submitJournalEntry(journalText)}
            >
              Submit Entry!
            </button>
            {/* <button onClick={() => countVotes()}>Count Votes</button> */}
          </div>
        </div>
      ) : (
        <div className="flex-col justify-center mx-auto align-middle pt-96">
          <p>Please connect your wallet</p>
        </div>
      )}
    </div>
  );
};

const Post = ({ text, address, timestamp }) => {
  return (
    <div
      className="bg-[#1c1f22] w-4/5 sm:w-2/5 rounded-md mx-auto flex flex-col px-2 py-4 items-start"
      style={{ minHeight: "64px" }}
    >
      <div className="text-gray-400 flex flex-row justify-between w-full">
        <div>{truncateStr(address)}</div>
        <div>{formatTimeAgo(new Date(timestamp * 1000))}</div>
      </div>
      <div className="mx-auto text-left p-2">{text}</div>
    </div>
  );
};

const App = () => {
  return (
    <Context>
      <Content />
    </Context>
  );
};
export default App;
