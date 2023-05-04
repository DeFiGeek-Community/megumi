import Head from "next/head";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";

export default function Home() {
  return (
    <>
      <Head>
        <title>Merkle-Airdrop-Tool</title>
        <meta name="description" content="Merkle-Airdrop-Tool" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <main>
        <h1>Merkle-Airdrop-Tool</h1>
        <h2>About</h2>
        <div>
          <p>
            Merkle-Airdrop-Tool is a generic merkle-distributor that identifies
            airdrop information by name.
          </p>
          <p>
            The deployment cost for merkle-distributor is 1 million Gas, but our
            registration cost is only 0.1 million Gas (0.2 million Gas including
            token deposit), which is quite reasonable!
          </p>
          <p>
            Additionally, by setting a fee for claiming the airdrop, an
            incentive is created for the airdrop provider to encourage many
            people to claim it.
          </p>
          <p>
            This project is powered by @uniswap/merkle-distributor and
            @uniswap/permit2.
          </p>
          <p>
            Creation of markle-tree files, deployment of airdrop information,
            and claims by users can all be done at this site!
          </p>
        </div>
        <h2>Create merkle-tree files</h2>
        <div>
          <p>You can create a markle-tree file in two ways.</p>
          <p>
            Host the markle-tree file yourselves (it will be used for claim).
          </p>
          <p>We don't save your markle-tree files, so don't lose it!</p>
          <h3>Manual</h3>
          <div>
            <p>The first method is manual.</p>
            <p>
              Enter the address and quantity of the target you wish to airdrop,
              and a markle-tree file will be created.
            </p>
            <Button
              variant="contained"
              href="/create-merkle-tree-manual"
              sx={{ p: 1, m: 1 }}
            >
              Create merkle-tree by manual
            </Button>
          </div>
          <h3>Snapshot</h3>
          <div>
            <p>The second method is snapshots.</p>
            <p>
              Automatically determines the quantity of airdrop tokens based on
              the percentage of any given token's holdings as of a specific
              block number.
            </p>
            <p>
              You can also enter addresses you wish to exclude from the airdrop.
            </p>
            <Button
              variant="contained"
              href="/create-merkle-tree-snapshot"
              sx={{ p: 1, m: 1 }}
            >
              Create merkle-tree by snapshot
            </Button>
          </div>
        </div>
        <h2>Regist Airdrop Information</h2>
        <div>
          <p>
            Regist airdrop information based on the merkle-tree file you
            created.
          </p>
          <p>
            Airdrop name cannot be registered in duplicate (checked when
            transaction is issued).
          </p>
          <h3>Registration Fee</h3>
          <div>
            <p>
              To prevent civil attacks against airdrop names, 0.01 ETH is
              collected as a registration fee for airdrop information.
            </p>
            <p>This may seem expensive, but there is a way to recoup this.</p>
            <p>
              Users pay 0.0001ETH as a fee to the airdrop registrar each time
              they claim an airdrop.
            </p>
            <p>
              In other words, if you have more than 100 people claim an airdrop,
              fee is practically free.
            </p>
            <p>Distribute to many people and get many people to claim!</p>
          </div>
          <h3>Transfers by Permit2</h3>
          <div>
            <p>
              If the deposit amount is greater than 0, the airdrop token will be
              transferred upon registration.
            </p>
            <p>
              This transfer is done using Uniswap's Permit2, If you are using
              Permit2 for the first time, an Approve transaction will be issued.
            </p>
            <p>
              You will then be asked to sign the transfer and issue the
              transaction.
            </p>
            <Button
              variant="contained"
              href="/regist-airdrop"
              sx={{ p: 1, m: 1 }}
            >
              Regist airdrop
            </Button>
            <p>
              If deposit amount is set to 0, only the airdrop information will
              be registered. You can make a deposit later (also using Permit2).
            </p>
            <Button
              variant="contained"
              href="/deposit-token"
              sx={{ p: 1, m: 1 }}
            >
              Deposit Token
            </Button>
          </div>
        </div>
        <h2>Claim Airdrop</h2>
        <div>
          <p>Registered airdrops can be claimed by the subject.</p>
          <p>
            Enter the airdrop name and the address of the hosted merkle-tree
            file.
          </p>
          <p>(It is helpful to redirect with each as a parameter of the URL)</p>
          <p>
            As a commission, each airdrop registrant and platform will collect
            0.0001 ETH (0.0002 ETH in total).
          </p>
          <Button variant="contained" href="/claim-airdrop" sx={{ p: 1, m: 1 }}>
            Claim Airdrop
          </Button>
        </div>
      </main>
    </>
  );
}
