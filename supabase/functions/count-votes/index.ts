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
    console.log(pollId, "pollid");
    console.log(body, "IDK body");

    const { data: durableTransactions, errorFetch } = await supabaseClient
      .from("durableTransactions")
      .select("transaction")
      .eq("pollId", pollId);
    console.log(durableTransactions, "IDK");
    if (errorFetch) throw errorFetch;

    const network = `https://rpc-devnet.helius.xyz/?api-key=${Deno.env.get(
      "HELIUS_API"
    )}`;
    const connection = new Connection(network);

    for (const txObj of durableTransactions) {
      const tx = bs58.decode(txObj.transaction);
      const sig = await sendAndConfirmRawTransaction(connection, tx);
      console.log("Sent durable transaction: ", sig);
    }

    const { errorDelete } = await supabaseClient
      .from("durableTransactions")
      .delete()
      .eq("pollId", pollId);
    if (errorDelete) {
      console.log("error while deleting txs from supabase");
    } else {
      console.log(`successfully deleted txs for poll: ${pollId}`);
    }

    if (errorDelete) throw errorDelete;

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
