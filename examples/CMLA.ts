import { Connection, PublicKey } from "@solana/web3.js";
import * as FermiDex from "../src";
import { rpcUrl } from "../config.json";
import * as anchor from "@project-serum/anchor";
import * as os from "os";
import * as path from "path";

const homeDirectory = os.homedir();
const solanaConfigPath = path.join(homeDirectory, ".config/solana/id.json");

const main = async () => {
  const owner = FermiDex.getLocalKeypair(solanaConfigPath);
  const connection = new Connection(rpcUrl);
  const bobKp = FermiDex.getLocalKeypair("./test-keypairs/user1/key.json");
  const aliceKp = FermiDex.getLocalKeypair("./test-keypairs/user2/key.json");
  const ownerWallet = new anchor.Wallet(owner);

  const provider = new anchor.AnchorProvider(
    connection,
    ownerWallet,
    anchor.AnchorProvider.defaultOptions()
  );

  console.log("Alice : ", aliceKp.publicKey.toString());
  console.log("Bob : ", bobKp.publicKey.toString());
  console.log("Owner : ", owner.publicKey.toString());

  // Create Mints
  const USDCMint = anchor.web3.Keypair.generate();
  const wSolMint = anchor.web3.Keypair.generate();
  const BonkMint = anchor.web3.Keypair.generate();

  await FermiDex.createMint(provider, wSolMint, 9);
  await FermiDex.createMint(provider, USDCMint, 6);
  await FermiDex.createMint(provider, BonkMint, 9);
  // 1. CREATE MARKET -- WORKING

  const wSol_usdc_market = await FermiDex.initialiseMarketCustom(
    owner,
    provider,
    wSolMint.publicKey,
    USDCMint.publicKey
  );

  const bonk_usdc_market = await FermiDex.initialiseMarketCustom(
    owner,
    provider,
    BonkMint.publicKey,
    USDCMint.publicKey
  );

  const aliceClient = new FermiDex.FermiClient({
    authority: aliceKp,
    connection,
    market: wSol_usdc_market,
  });

  const bobClient = new FermiDex.FermiClient({
    authority: aliceKp,
    connection,
    market: bonk_usdc_market,
  });
  await FermiDex.sleep(30000,'Waiting for market to be initialised...Sleeping for 30 sec');
  // 2. Airdrop Tokens -- WORKING
  console.log("AIRDROPPING TOKENS !!");
  console.log("------------------------");

  // airdrop tokens to bob
  await FermiDex.airdropToken({
    receiverPk: bobKp.publicKey,
    amount: 1000 * 10 ** 9,
    connection,
    mint: wSolMint.publicKey,
    ownerKp: owner,
  });

  // airdrop pc acccounts
  await FermiDex.airdropToken({
    receiverPk: bobKp.publicKey,
    amount: 1000 * 10 ** 6,
    connection,
    mint: USDCMint.publicKey,
    ownerKp: owner,
  });

  await FermiDex.airdropToken({
    receiverPk: bobKp.publicKey,
    amount: 1000 * 10 ** 9,
    connection,
    mint: BonkMint.publicKey,
    ownerKp: owner,
  });

  // AIRDROP TO ALICE
  await FermiDex.airdropToken({
    receiverPk: aliceKp.publicKey,
    amount: 1000 * 10 ** 9,
    connection,
    mint: wSolMint.publicKey,
    ownerKp: owner,
  });


  await FermiDex.airdropToken({
    receiverPk: aliceKp.publicKey,
    amount: 1000 * 10 ** 6,
    connection,
    mint: USDCMint.publicKey,
    ownerKp: owner,
  });

  await FermiDex.airdropToken({
    receiverPk: aliceKp.publicKey,
    amount: 1000 * 10 ** 9,
    connection,
    mint: BonkMint.publicKey,
    ownerKp: owner,
  });



  await FermiDex.sleep(30000,'Waiting for airdrop to be processed...Sleeping for 30 sec');
  console.log("Sleep ended !");

  // 4. PLACING ORDERS

  // Alice places new Bid on both markets
  // Place Bid on USDC/wSol market
  await aliceClient.placeBuyOrder(20, 50);
  console.log("Alice placed bid for 50 wsol at 20 usdc price");

  //Place Bid on USDC/Bonk market    coinMint: BonkMint.publicKey,
  // change market for aliceClient
  aliceClient.setCurrentMarket(bonk_usdc_market);
  await aliceClient.placeBuyOrder(0.01, 10000);
  console.log("Alice placed bid for 10000 bonk at 0.01 usdc price");

  // Bob places new sell order on Bonk/USDC market, selling 500 USDC worth of Sol at the market price.
  await bobClient.placeSellOrder(0.01, 500000);
  console.log("Bob placed ask for 500000 bonk at 0.01 usdc price");

  await FermiDex.sleep(30000,"waiting for orders to be processed , sleeping for 30 sec");
  console.log("Sleep ended !");

  // 5. Finalise Orders
  //BOB FINALISES ORDERS

  const bobOpenOrdersAcc = await bobClient.getOpenOrders();
  const aliceOpenOrdersAcc = await aliceClient.getOpenOrders();
  
  console.log({bobOpenOrdersAcc});
  console.log({aliceOpenOrdersAcc});

  const eventQmarket1 = await FermiDex.getParsedEventQ({
    marketPda: new PublicKey(wSol_usdc_market.marketPda),
    program: FermiDex.getFermiDexProgram(owner, connection),
  });

  const eventQmarket2 = await FermiDex.getParsedEventQ({
    marketPda: new PublicKey(wSol_usdc_market.marketPda),
    program: FermiDex.getFermiDexProgram(owner, connection),
  });

  console.log({ eventQmarket1, eventQmarket2 });

  const matchedEvents = await bobClient.getFinalisableOrderMap();

  console.log({matchedEvents});


  console.log({ matchedEvents });
  const matchedOrders = Object.keys(matchedEvents);
  const orderIdToFinalise = matchedOrders[0];
  const match = matchedEvents[orderIdToFinalise];

  if (match) {
    const finaliseSellOrder = await aliceClient.finaliseSellOrder(
      orderIdToFinalise,
      aliceKp,
      match.eventSlot1,
      match.eventSlot2
    );
    console.log({ finaliseSellOrder });
    const finaliseBuyOrder = await bobClient.finaliseBuyOrder(
      orderIdToFinalise,
      bobKp,
      match.eventSlot1,
      match.eventSlot2
    );
    console.log({ finaliseBuyOrder });
  } else {
    console.log("No matches found");
  }

  //   console.log(
  //     ` ✅SUCCESSFULLY FINALIZED  ${orderId} and events ${orderIdMatched.idx} <-> ${orderIdSecondMatched?.idx}`
  //   );
  // }
};

(async function () {
  try {
    await main();
  } catch (err) {
    console.log("Error: ", err);
    process.exit(1);
  }
  process.exit(0);
})();
