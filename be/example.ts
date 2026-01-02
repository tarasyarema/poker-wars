import Poker from 'poker-ts';

const table = new Poker.Table({ smallBlind: 50, bigBlind: 100 })

table.sitDown(0, 1000); // seat a player at seat 0 with 1000 chips buy-in
table.sitDown(1, 2000); // seat a player at seat 1 with 2000 chips buy-in
table.sitDown(2, 1500); // seat a player at seat 2 with 1500 chips buy-in
table.sitDown(3, 1200); // seat a player at seat 3 with 1200 chips buy-in
// seat 4 is empty
table.sitDown(5, 1700); // seat a player at seat 5 with 1700 chips buy-in
table.sitDown(6, 800);  // seat a player at seat 6 with 800 chips buy-in

table.startHand();

while (table.isHandInProgress()) {
    while (table.isBettingRoundInProgress()) {
        const seatIndex = table.playerToAct();
        console.log(`\n> Player at seat ${seatIndex} to act.`);

        const legal = table.legalActions()

        const availableActions = legal.actions;
        console.log(`Legal actions: ${JSON.stringify(legal)}`);

        // Get random action from available actions
        const action = availableActions[Math.floor(Math.random() * availableActions.length)];

        // has `min` and `max` properties
        const chipRange = legal.chipRange;

        if (action === "fold") {
            // Only fold when if not forced to call
            if (availableActions.includes("call")) {
                // 50% chance to fold when can call
                if (Math.random() < 0.5) {
                    table.actionTaken("fold");
                    console.log(`Player at seat ${seatIndex} folded.`);
                    continue;
                } else {
                    table.actionTaken("call");
                    console.log(`Player at seat ${seatIndex} called.`);
                    continue;
                }
            }

            table.actionTaken("fold");
            console.log(`Player at seat ${seatIndex} folded.`);
            continue;
        }

        if (action === "call") {
            table.actionTaken("call");
            console.log(`Player at seat ${seatIndex} called.`);
            continue;
        }

        if (action === "raise" && chipRange) {
            // Choose a random amount within the chip range
            const amount = Math.floor(Math.random() * (chipRange!.max - chipRange.min + 1)) + chipRange.min;
            table.actionTaken("raise", amount);
            console.log(`Player at seat ${seatIndex} raised to ${amount}.`);
            continue;
        }

        if (action === "check") {
            table.actionTaken("check");
            console.log(`Player at seat ${seatIndex} checked.`);
            continue;
        }
    }

    table.endBettingRound()

    if (table.areBettingRoundsCompleted()) {
        table.showdown()
    }
}

console.log(JSON.stringify(table.winners(), null, 2));
