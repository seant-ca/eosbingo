import ScatterJS from 'scatter-js/dist/scatter.esm'
import { Promise,IPromise }
    from "eosbingo-common/util/promise";


// If you wanted to build a reference object within your code to
// reflect the above table you could do so like this:
const Blockchains = {
    EOS:'eos',
    Ethereum:'eth'
};
// And then you can use it like this:
const blockchain = Blockchains.EOS;

const chainId = 'aca376f206b8fc25a6ed44dbdc66547c36c6c33e3a119ffbeaef943642f0e906'

const network = {
    blockchain,
    host:'api.eosnewyork.io',
    port:443,
    protocol:'https',
    chainId
};


declare var Eos:any;


interface IEosAccount
{
    name:string;
    authority:string;
}


export class ScatterService
{
    private _hasScatter = false;
    private scatter:any;    

    private eosAccount:IEosAccount;

    constructor() {
        ScatterJS.scatter.connect("EOS-Bingo").then(connected => {
            if(!connected) return;

            this._hasScatter = true;
            this.scatter = ScatterJS.scatter;
            window['scatter'] = null;
        });

        this.checkForScatter();
    }

    login():IPromise<string> {
        var promise = new Promise<string>();   

        if (!this.scatter.identity) {
            this.getIdentity(promise);
        } else {
            this.authenticate(promise);
        }

        return promise;
    }
    private getIdentity(promise:Promise<string>) {
        const requiredFields = {
            accounts:[ network ]
        };

        var that = this;
    
        this.scatter.getIdentity(requiredFields).then(identity => {
            // This would give back an object with the required fields such as `firstname` and `lastname`
            // as well as add a permission for your domain or origin to the user's Scatter to allow deeper
            // requests such as requesting blockchain signatures, or authentication of identities.
            that.authenticate(promise);
        }).catch(error => {
            promise.fail({
                code: 'Could Not Retrieve Identity from Scatter.',
                data: error
            })
        });
    }
    private authenticate(promise:Promise<string>) {
        //console.log(scatter.identity);

        const account = this.scatter.identity.accounts.find(
            account => account.blockchain === 'eos'
        );

        this.eosAccount = account;


        // Once a user has given you an Identity you can simply do
        this.scatter.authenticate().then(result => {

            // Authentication passed, you can also
            // double validate the the public key on their
            // identity has signed the returned `result` which will be
            // your domain
            promise.done(result);
        }).catch(error => {
            // Authentication Failed!
            promise.fail({
                code: 'Scatter Authentication Failed.',
                data: error
            });
        });
    }

    transferEOS(
        gameId:number,
        amount:string
    ):IPromise<string>
    {
        if (!this.hasScatter)
            return;

        var scatter = this.scatter;

        if (!scatter.identity) {
            //this.getIdentity();
            return;
        }


        var promise = new Promise<string>();
    

        const expireInSeconds = 60;
    
        // Set up any extra options you want to use eosjs with.
        const eosOptions = {chainId,expireInSeconds};
    
        const eos = scatter.eos( network, Eos, eosOptions );
    
        let eosGamesAccount = 'eosgamesnet1'
    
        // You can now use the `eos` object just like you normally would with `eosjs`,
        // except that it will defer transaction signing to the user instead of your application.
        eos.transaction({
            actions: [
                {
                    account: 'eosio.token',
                    name: 'transfer',
                    authorization: [{
                        actor: this.eosAccount.name,
                        permission: this.eosAccount.authority
                    }
                ],
                data: {
                    from: this.eosAccount.name,
                    to: eosGamesAccount,
                    quantity: amount+" EOS",
                    "memo": "EOS Bingo Card for Game #"+gameId
                    }
                }
            ]
        }).then(
            (result) => {
                promise.done(result.transaction_id);
            },
            (error) => {
                promise.fail({
                    code: 'The EOS Transaction was NOT successful.',
                    data: error
                });
            }
        );

        return promise;
    }

    logout() {
        if (this.hasScatter) {
            this.scatter.forgetIdentity();
        }
    }

    get eosAccountName() {
        return this.eosAccount.name;
    }

    get hasScatter():boolean
    {
        return this._hasScatter;
    }
}
