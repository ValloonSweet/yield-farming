import { ethers } from "hardhat";
import chai, { expect, use} from "chai";
import { Contract, BigNumber } from "ethers";
import { solidity } from "ethereum-waffle";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { time } from "@openzeppelin/test-helpers";

describe("VswFarm", () => {
    
    let owner: SignerWithAddress;
    let alice: SignerWithAddress;
    let bob: SignerWithAddress;
    let res: any;
    let vswFarm: Contract;
    let vswToken: Contract;
    let mockDai: Contract;

    const daiAmount: BigNumber = ethers.utils.parseEther("25000");
  

    beforeEach(async() => {
        const VswFarm = await ethers.getContractFactory("VswFarm");
        const VswToken = await ethers.getContractFactory("VswToken");
        const MockDai = await ethers.getContractFactory("MockERC20");
        mockDai = await MockDai.deploy("MockDai", "mDAI");
        [owner, alice, bob] = await ethers.getSigners();
        await Promise.all([
            mockDai.mint(owner.address, daiAmount),
            mockDai.mint(alice.address, daiAmount),
            mockDai.mint(bob.address, daiAmount)
        ]);
        vswToken = await VswToken.deploy();
        vswFarm = await VswFarm.deploy(mockDai.address, vswToken.address);
    })

    describe("Init", async() => {
        it("should initialize", async() => {
            expect(vswToken).to.be.ok
            expect(vswFarm).to.be.ok
            expect(mockDai).to.be.ok
        })
    })


    describe("Stake", async() => {
        it("should accept DAI and update mapping", async() => {
            let toTransfer = ethers.utils.parseEther("100")
            await mockDai.connect(alice).approve(vswFarm.address, toTransfer)
    
            expect(await vswFarm.isStaking(alice.address))
                .to.eq(false)
            
            expect(await vswFarm.connect(alice).stake(toTransfer))
                .to.be.ok
    
            expect(await vswFarm.stakingBalance(alice.address))
                .to.eq(toTransfer)
            
            expect(await vswFarm.isStaking(alice.address))
                .to.eq(true)
        })
    
        it("should update balance with multiple stakes", async() => {
            let toTransfer = ethers.utils.parseEther("100")
            await mockDai.connect(alice).approve(vswFarm.address, toTransfer)
            await vswFarm.connect(alice).stake(toTransfer)
    
            await mockDai.connect(alice).approve(vswFarm.address, toTransfer)
            await vswFarm.connect(alice).stake(toTransfer)
    
            expect(await vswFarm.stakingBalance(alice.address))
                .to.eq(ethers.utils.parseEther("200"))
        })
    
        it("should revert with not enough funds", async() => {
            let toTransfer = ethers.utils.parseEther("1000000")
            await mockDai.approve(vswFarm.address, toTransfer)
    
            await expect(vswFarm.connect(bob).stake(toTransfer))
                .to.be.revertedWith("You cannot stake zero tokens")
        })
    })

    describe("Unstake", async() => {
        beforeEach(async() => {
            let toTransfer = ethers.utils.parseEther("100")
            await mockDai.connect(alice).approve(vswFarm.address, toTransfer)
            await vswFarm.connect(alice).stake(toTransfer)
        })

        it("should unstake balance from user", async() => {
            let toTransfer = ethers.utils.parseEther("100")
            await vswFarm.connect(alice).unstake(toTransfer)

            res = await vswFarm.stakingBalance(alice.address)
            expect(Number(res))
                .to.eq(0)

            expect(await vswFarm.isStaking(alice.address))
                .to.eq(false)
        })
    })

    describe("WithdrawYield", async() => {

        beforeEach(async() => {
            await vswToken.transferOwnership(vswFarm.address)
            let toTransfer = ethers.utils.parseEther("10")
            await mockDai.connect(alice).approve(vswFarm.address, toTransfer)
            await vswFarm.connect(alice).stake(toTransfer)
        })

        it("should return correct yield time", async() => {
            let timeStart = await vswFarm.startTime(alice.address)
            expect(Number(timeStart))
                .to.be.greaterThan(0)

            // Fast-forward time
            await time.increase(86400)

            expect(await vswFarm.calculateYieldTime(alice.address))
                .to.eq((86400))
        })

        it("should mint correct token amount in total supply and user", async() => { 
            await time.increase(86400)

            let _time = await vswFarm.calculateYieldTime(alice.address)
            let formatTime = _time / 86400
            let staked = await vswFarm.stakingBalance(alice.address)
            let bal = staked * formatTime
            let newBal = ethers.utils.formatEther(bal.toString())
            let expected = Number.parseFloat(newBal).toFixed(3)

            await vswFarm.connect(alice).withdrawYield()

            res = await vswToken.totalSupply()
            let newRes = ethers.utils.formatEther(res)
            let formatRes = Number.parseFloat(newRes).toFixed(3).toString()

            expect(expected)
                .to.eq(formatRes)

            res = await vswToken.balanceOf(alice.address)
            newRes = ethers.utils.formatEther(res)
            formatRes = Number.parseFloat(newRes).toFixed(3).toString()

            expect(expected)
                .to.eq(formatRes)
        })

        it("should update yield balance when unstaked", async() => {
            await time.increase(86400)
            await vswFarm.connect(alice).unstake(ethers.utils.parseEther("5"))

            res = await vswFarm.vswBalance(alice.address)
            expect(Number(ethers.utils.formatEther(res)))
                .to.be.approximately(10, .001)
        })

    })
});
