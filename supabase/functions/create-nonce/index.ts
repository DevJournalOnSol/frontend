// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import bs58 from "https://esm.sh/bs58";
import {
  Connection,
  sendAndConfirmRawTransaction,
} from "https://deno.land/x/solana_web3@v1.41.0-0/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js";

console.log("Functions booting up yoo");
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      {
        global: {
          headers: {
            Authorization: `Bearer ${Deno.env.get(
              "SUPABASE_SERVICE_ROLE_KEY"
            )}`,
          },
        },
      }
    );
    let pollId = null;
    const body = await req.json();
    pollId = body.pollId;

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

    return new Response(JSON.stringify({ status: "Ok" }), {
      ...corsHeaders,
      status: 200,
    });
  } catch (error) {
    console.error(error);
    return new Response(JSON.stringify({ error: error.message }), {
      ...corsHeaders,
      status: 400,
    });
  }
});
