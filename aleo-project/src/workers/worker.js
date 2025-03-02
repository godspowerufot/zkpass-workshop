import {
  Account,
  ProgramManager,
  PrivateKey,
  initThreadPool,
  AleoKeyProvider,
  AleoNetworkClient,
  NetworkRecordProvider,
} from "@provablehq/sdk";
import { expose, proxy } from "comlink";
import { ZPassSDK } from "zpass-sdk";
await initThreadPool();




async function issueZPass(privateKey,inputs){
  const zpass=new ZPassSDK({
    privateKey,
    host:"https://api.explorer.provable.com/v1",
    network:"testnet"
  })

  
  const account=new Account({privateKey})
  const issuer =account.address().to_string()
  const merkleRoot=await zpass.getMerkleRoot(inputs);
  const leavesHashes=await zpass.getLeavesHashes(inputs);
  const leavesHashesString=`[${leavesHashes.join(",")}]`
  const sig=await zpass.signMerkleRoot(merkleRoot)


  const txI=await  zpass.issueZPass({
    programName:"zpass_merkle_8.aleo",
    functionName:"issue",
    inputs:[sig,leavesHashesString,issuer],
    fee:0.1,
    privateFee:false
  })

console.log(txI)
  return txI
}

async function localProgramExecution(program, aleoFunction, inputs) {
  const programManager = new ProgramManager();

  // Create a temporary account for the execution of the program
  const account = new Account();
  programManager.setAccount(account);

  const executionResponse = await programManager.run(
    program,
    aleoFunction,
    inputs,
    false,
  );
  return executionResponse.getOutputs();
}

async function getPrivateKey() {
  const key = new PrivateKey();
  return proxy(key);
}

async function deployProgram(program) {
  const keyProvider = new AleoKeyProvider();
  keyProvider.useCache(true);

  // Create a record provider that will be used to find records and transaction data for Aleo programs
  const networkClient = new AleoNetworkClient("https://api.explorer.provable.com/v1");

  // Use existing account with funds
  const account = new Account({
    privateKey: "user1PrivateKey",
  });

  const recordProvider = new NetworkRecordProvider(account, networkClient);

  // Initialize a program manager to talk to the Aleo network with the configured key and record providers
  const programManager = new ProgramManager(
    "https://api.explorer.provable.com/v1",
    keyProvider,
    recordProvider,
  );

  programManager.setAccount(account);

  // Define a fee to pay to deploy the program
  const fee = 1.9; // 1.9 Aleo credits

  // Deploy the program to the Aleo network
  const tx_id = await programManager.deploy(program, fee);

  // Optional: Pass in fee record manually to avoid long scan times
  // const feeRecord = "{  owner: aleo1xxx...xxx.private,  microcredits: 2000000u64.private,  _nonce: 123...789group.public}";
  // const tx_id = await programManager.deploy(program, fee, undefined, feeRecord);

  return tx_id;
}

const workerMethods = { localProgramExecution, getPrivateKey, deployProgram,issueZPass};
expose(workerMethods);
