// Withdraw Pc Tokens

import { Program } from "@project-serum/anchor";
import { FermiDex } from "../types";
import * as anchor from "@project-serum/anchor";
import { Keypair, PublicKey } from "@solana/web3.js";
import * as spl from "@solana/spl-token";

type DepositParams = {
  program: Program<FermiDex>;
  amount: number;
  marketPda: PublicKey;
  coinMint: PublicKey;
  pcMint: PublicKey;
  authority: Keypair;
};

const withdrawPcTokens = async ({
  program,
  amount,
  marketPda,
  coinMint,
  pcMint,
  authority,
}: DepositParams) => {
  try {
    const pcVault = await spl.getAssociatedTokenAddress(
      pcMint,
      marketPda,
      true
    );

    const coinVault = await spl.getAssociatedTokenAddress(
      coinMint,
      marketPda,
      true
    );

    const authorityPcTokenAccount = await spl.getAssociatedTokenAddress(
      new anchor.web3.PublicKey(pcMint),
      authority.publicKey,
      false
    );

    const [openOrdersPda] = await anchor.web3.PublicKey.findProgramAddress(
      [
        Buffer.from("open-orders", "utf-8"),
        new anchor.web3.PublicKey(marketPda).toBuffer(),
        authority.publicKey.toBuffer(),
      ],
      new anchor.web3.PublicKey(program.programId)
    );

    const withdrawIx = await program.methods
      .withdrawCoins(new anchor.BN(amount))
      .accounts({
        openOrders: openOrdersPda,
        market: marketPda,
        coinMint: coinMint,
        pcMint: pcMint,
        coinVault: coinVault,
        pcVault: pcVault,
        payer: authorityPcTokenAccount,
        authority: authority.publicKey,
      })
      .signers([authority])
      .rpc();

    console.log("Successfully withdrawed ", { amount, withdrawIx });
  } catch (err) {
    console.log(err);
  }
};

const withdrawCoinTokens = async ({
  program,
  amount,
  marketPda,
  coinMint,
  pcMint,
  authority,
}: DepositParams) => {
  try {
    const pcVault = await spl.getAssociatedTokenAddress(
      pcMint,
      marketPda,
      true
    );

    const coinVault = await spl.getAssociatedTokenAddress(
      coinMint,
      marketPda,
      true
    );

    const authorityPcTokenAccount = await spl.getAssociatedTokenAddress(
      new anchor.web3.PublicKey(pcMint),
      authority.publicKey,
      false
    );

    const [openOrdersPda] = await anchor.web3.PublicKey.findProgramAddress(
      [
        Buffer.from("open-orders", "utf-8"),
        new anchor.web3.PublicKey(marketPda).toBuffer(),
        authority.publicKey.toBuffer(),
      ],
      new anchor.web3.PublicKey(program.programId)
    );

    const withdrawIx = await program.methods
      .withdrawTokens(new anchor.BN(amount))
      .accounts({
        openOrders: openOrdersPda,
        market: marketPda,
        coinMint: coinMint,
        pcMint: pcMint,
        coinVault: coinVault,
        pcVault: pcVault,
        payer: authorityPcTokenAccount,
        authority: authority.publicKey,
      })
      .signers([authority])
      .rpc();

    console.log("Successfully withdrawed ", { amount, withdrawIx });
  } catch (err) {
    console.log(err);
  }
};
export default { withdrawPcTokens, withdrawCoinTokens };
