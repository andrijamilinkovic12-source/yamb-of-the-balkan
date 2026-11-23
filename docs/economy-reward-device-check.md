# Rewarded ads: staging acceptance check

Use a dedicated test account and Android staging client pointed at the revision under test. Confirm the staging app ID, server and database before playing. Do not use a production account, redirect a production ad unit's callback, or disable signature verification.

Confirm that this build requests the intended rewarded unit on a registered test device, displays a test ad, and that the unit sends signed callbacks to the staging server's `/api/admob/reward-ssv`. The banner test-mode switch in the game is not a rewarded-ad switch. Check the server's allowed rewarded unit and leave headroom in the wallet and token inventory.

| Action on the phone | Expected result on the same account after reopening |
| --- | --- |
| Finish a regular match and watch the game-over x2 ad | Total paid for that match is the displayed doubled entitlement, including earned record bonuses and the game cap. If base was already paid, only the difference is added. |
| Finish an unclaimed daily challenge and watch its x2 ad | The original challenge day is credited twice its earned amount in total. Retrying does not pay again. |
| Watch the shop ducat ad | Balance increases by exactly 500 once. |
| Watch the undo-token ad below the cap | Inventory increases by exactly one token. Using a token for an eligible undo consumes one. |
| Watch the discount ad for a locked, purchasable item | That item shows the server-confirmed 20% discount. Reopen within the discount window, buy once, and verify the charged price, ownership and no second debit. |

For each row, record the starting state, ad completion time, receipt/claim time, and final state. Correlate the staging receipt and claim using the same account, nonce, context and match/day/item where applicable; keep account IDs and receipt details out of public reports.

Repeat a wallet award while the client briefly loses connectivity after earning the reward, then reconnect/reopen. Acceptance requires one credit without watching another ad. A missing signed callback, a callback for a different target, an unconsumed receipt or a second debit/credit is a failed or pending test, not a pass.
