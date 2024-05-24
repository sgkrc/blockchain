import { ethers } from "hardhat"
import { expect } from "chai";

import { Exchange } from "../typechain-types/contracts/Exchange"
import { Token } from "../typechain-types/contracts/Token";
import { BigNumber } from "ethers";

const toWei = (value: number) => ethers.utils.parseEther(value.toString());
const toEther = (value: BigNumber) => ethers.utils.formatEther(value);
const getBalance = ethers.provider.getBalance;

describe("Exchange", () => {
    let owner: any;
    let user: any;
    let exchange: Exchange;
    let token: Token;

    beforeEach(async () => {

        //기본적으로 10,000개의 Ether를 가지고 있음.
        [owner, user] = await ethers.getSigners();
        const TokenFactory = await ethers.getContractFactory("Token");
        token = await TokenFactory.deploy("GrayToken", "GRAY", toWei(1000000));
        await token.deployed();

        const ExchangeFactory = await ethers.getContractFactory("Exchange");
        exchange = await ExchangeFactory.deploy(token.address);
        await exchange.deployed();
    });

    describe("addLiquidity", async () => {
        it("add liquidity", async () => {
          await token.approve(exchange.address, toWei(500));
          await exchange.addLiquidity(toWei(500), { value: toWei(1000) });
          expect(await getBalance(exchange.address)).to.equal(toWei(1000));
          expect(await token.balanceOf(exchange.address)).to.equal(toWei(500));

          await token.approve(exchange.address, toWei(100));
          await exchange.addLiquidity(toWei(100), { value: toWei(200) });
          expect(await getBalance(exchange.address)).to.equal(toWei(1200));
          expect(await token.balanceOf(exchange.address)).to.equal(toWei(600));
        });
      });


    describe("removeLiquidity", async () => {
        it("remove liquidity", async () => {
          await token.approve(exchange.address, toWei(500));
          await exchange.addLiquidity(toWei(500), { value: toWei(1000) });
          expect(await getBalance(exchange.address)).to.equal(toWei(1000));
          expect(await token.balanceOf(exchange.address)).to.equal(toWei(500));

          await token.approve(exchange.address, toWei(100));
          await exchange.addLiquidity(toWei(100), { value: toWei(200)});
          expect(await getBalance(exchange.address)).to.equal(toWei(1200));
          expect(await token.balanceOf(exchange.address)).to.equal(toWei(600));
          
          //여기까지 풀에 있는 eth가 1200, gray가 600이므로
          //600개의 유동성을 제거하면 1200개 중 절반이므로 각 풀에 남아있는 양도 절반이 된다.
          await exchange.removeLiquidity(toWei(600));
          expect(await getBalance(exchange.address)).to.equal(toWei(600));
          expect(await token.balanceOf(exchange.address)).to.equal(toWei(300));
        });
      });

    describe("getOutputAmount", async () => {
        it("correct getOutputAmount", async () => {
          await token.approve(exchange.address, toWei(4000));
          //4:1
          await exchange.addLiquidity(toWei(4000), { value: toWei(1000) });
          
          //get 1ETH : ??GRAY
          console.log(toEther(await exchange.getOutputAmount(toWei(1), getBalance(exchange.address), token.balanceOf(exchange.address))));
        });
      });

    describe("getTokenPrice", async() => {
        it("correct get Token Price", async() => {
            await token.approve(exchange.address, toWei(1000));
            await exchange.addLiquidity(toWei(1000), { value: toWei(1000) });
            
            const tokenReserve = await token.balanceOf(exchange.address);
            const etherReserve = await getBalance(exchange.address);

            // GRAY Price
            // Expect 1ETH per 1GRAY
            expect(
                (await exchange.getPrice(tokenReserve, etherReserve))
            ).to.eq(1);
        })
    })

    describe("ethToTokenSwap", async() => {
        it("correct ethToTokenSwap", async() => {
            await token.approve(exchange.address, toWei(4000));
            
            // GRAY : ETH 4:1
            await exchange.addLiquidity(toWei(4000), { value: toWei(1000) });
            
            // 1ETH : ?? GRAY
            await exchange.connect(user).ethToTokenSwap(toWei(3.99), {value: toWei(1)});

            console.log(toEther(await token.balanceOf(user.address)));
            // expect(
            //     (toEther(await token.balanceOf(user.address)))
            // ).to.eq("1.0");

            // expect(
            //     (toEther(await token.balanceOf(exchange.address)))
            // ).to.eq("999.0");

            // expect(
            //     (toEther(await getBalance(exchange.address)))
            // ).to.eq("1001.0");
            
        })
    })
})