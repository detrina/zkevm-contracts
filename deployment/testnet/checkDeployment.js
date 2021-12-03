const { expect } = require('chai');
const { ethers } = require('hardhat');
const fs = require('fs');
const path = require('path');

async function checkDeployment() {
    // load signers
    const [sequencer] = await ethers.getSigners();
    const output = JSON.parse(fs.readFileSync(path.join(__dirname, '/deploy_output.json')));
    // get mock verifier
    const VerifierRollupHelperFactory = await ethers.getContractFactory(
        'VerifierRollupHelperMock',
    );
    const verifierContract = await VerifierRollupHelperFactory.attach(output.verifierMockAddress);

    // get MATIC
    const maticTokenFactory = await ethers.getContractFactory('ERC20PermitMock');
    const maticTokenContract = await maticTokenFactory.attach(output.maticTokenAddress);

    // get bridge
    const BridgeFactory = await ethers.getContractFactory('Bridge');
    const bridgeContract = await BridgeFactory.attach(output.bridgeAddress);

    // get proof of efficiency
    const ProofOfEfficiencyFactory = await ethers.getContractFactory('ProofOfEfficiency');
    const proofOfEfficiencyContract = await ProofOfEfficiencyFactory.attach(output.proofOfEfficiencyAddress);
    await proofOfEfficiencyContract.deployed();

    // fund sequencer address with Matic tokens
    await maticTokenContract.transfer(sequencer.address, ethers.utils.parseEther('100'));

    // Check public constants
    expect(await proofOfEfficiencyContract.matic()).to.equal(maticTokenContract.address);
    expect(await proofOfEfficiencyContract.CHAIN_ID_DEFAULT()).to.equal(ethers.BigNumber.from(10000));
    expect(await proofOfEfficiencyContract.numSequencers()).to.equal(ethers.BigNumber.from(0));
    expect(await proofOfEfficiencyContract.lastBatchSent()).to.equal(ethers.BigNumber.from(0));
    expect(await proofOfEfficiencyContract.lastVerifiedBatch()).to.equal(ethers.BigNumber.from(0));
    expect(await proofOfEfficiencyContract.bridge()).to.equal(bridgeContract.address);
    expect(await proofOfEfficiencyContract.currentStateRoot()).to.equal(ethers.BigNumber.from(ethers.constants.HashZero));
    expect(await proofOfEfficiencyContract.currentLocalExitRoot()).to.equal(ethers.BigNumber.from(ethers.constants.HashZero));
    expect(await proofOfEfficiencyContract.rollupVerifier()).to.equal(verifierContract.address);

    // Check struct - Sequencer
    const seqStruct = await proofOfEfficiencyContract.sequencers('0x29e5f310317B68bf949926E987Fa0Df05Ef26501');
    expect(seqStruct.sequencerURL).to.equal('');
    expect(seqStruct.chainID).to.equal(ethers.BigNumber.from(0));
    expect(seqStruct.length).to.equal(2);

    // Check struct - BatchData
    const batchStruct = await proofOfEfficiencyContract.sentBatches(1);
    expect(batchStruct.sequencerAddress).to.equal(ethers.constants.AddressZero);
    expect(batchStruct.batchL2HashData).to.equal(ethers.constants.HashZero);
    expect(batchStruct.maticCollateral).to.equal(ethers.BigNumber.from(0));
    expect(batchStruct.length).to.equal(3);
    console.log('PoE Deployment checks succeed');
}

checkDeployment().catch((e) => {
    console.error(e);
    process.exit(1);
});
