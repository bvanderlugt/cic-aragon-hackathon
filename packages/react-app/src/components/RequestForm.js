import React, {useState, useEffect} from 'react';
import { NavEnums } from '../App'
import { Button, Input } from 'antd';
import {
    useApps,
    useOrganization,
    usePermissions,
  } from '@aragon/connect-react'
import { ethers } from 'ethers';
import { TokenManager } from '@aragon/connect-thegraph-tokens'
// import { pam_token } from "../contracts/abis"
import ecr20Abi from "../contracts/abis/ecr20Token.json"


const GAS_LIMIT = 450000
const DAI_TOKEN_ADDRESS = "0x0527E400502d0CB4f214dd0D2F2a323fc88Ff924"

export default function RequestForm(props) {

    const [org, orgStatus] = useOrganization()
    const [apps, appsStatus] = useApps()
    const [permissions, permissionsStatus] = usePermissions()
    const [cicAmount, setCicAmount] = useState(1)
    const [depositAmount, setDepositAmonut] = useState(2)
    const [waitingForRequest, setWaitingForRequest] = useState(false)

    // useEffect( () => {
    //     const fetch = async () => {
    //         const tokenManager = new TokenManager(
    //             // "0x463c45fb0f800428b3f29e41c107a15e9d754320", //CIC prototype
    //             "0x2b643d49cc4115e2ad3a987e59bda115571ea506", // pineapple mango 
    //             "https://api.thegraph.com/subgraphs/name/aragon/aragon-tokens-rinkeby"
    //         )
    //         const token = await tokenManager.token();
    //         console.log(token)
    //     }
    //     fetch()
    // }, []);

    const createTokenRequest = async () => {
        try {
            const tokenRequest = await org.app('token-request');
            const intent = org.appIntent(tokenRequest.address, 'createTokenRequest', [
                DAI_TOKEN_ADDRESS,
                ethers.utils.parseEther(depositAmount.toString()), // deposit amount
                ethers.utils.parseEther(cicAmount.toString()), // return amount
                "aHashOfSignedContract" 
            ])
            const txPath = await intent.paths(props.address)
            return txPath

        } catch (error) {
            console.log(`Unable to complete transaction create ${error}`)
        }
    }

    const requestMinting = async () => {
        setWaitingForRequest(true);
        const txPath = await createTokenRequest()
        const signer = props.injectedProvider.getSigner()
        if (txPath.transactions) {
            const tx = txPath.transactions[0]
            const { to, data } = tx;
            try {
                const contract = new ethers.Contract(DAI_TOKEN_ADDRESS, ecr20Abi, signer);
                const result = await contract.approve(to, ethers.utils.parseEther('20'), { 
                    gasLimit: GAS_LIMIT
                })
                console.log(result)
                const txResult = await signer.sendTransaction({data, to, gasLimit: GAS_LIMIT})
                console.log(txResult)
            } catch (error) {
                console.log(`${JSON.stringify(error)}`)
            } finally {
                setWaitingForRequest(false);
            }
        } else {
            console.log(`Error: Unable to find any transactions in path.`)
            setWaitingForRequest(false)
        }
    }

    const loading =
        orgStatus.loading || appsStatus.loading || permissionsStatus.loading
    const error = orgStatus.error || appsStatus.error || permissionsStatus.error

    const title = "Request your CIC issuance"

    if (props.currentStep !== NavEnums.REQUEST) return null
    if (error) return <p>Sorry, unable to reach to CIC Aragon org {error.message}</p>
    return (
        <div className="onboardContainer">
            <div className="onboardTitle">{title}</div>
            <div className="onboardBody">
                {/* <div>Ammount of CIC commitment: <Input onInput={(e) => setCicAmount(e)}></Input></div> */}
            </div>
            <div className="onboardFooter">
                <Button type="primary" className="onboardButton" loading={waitingForRequest || loading} onClick={() => requestMinting()}>{"Request Minting"}</Button>
            </div>
        </div>
    )
}