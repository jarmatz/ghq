// game board sizes
export const ROWS: number = 8;
export const COLUMNS: number = 8;

export type BoardConfigEntry = {
        name: string,
        row: number,
        column: number
}

export type BoardConfig = BoardConfigEntry[];

// initial setup of reserve counts and piece placement
export const standardSetup = {
    trayConfig: [
        {name: "standard-infantry", count: 5},
        {name: "armored-infantry", count: 3},
        {name: "airborne-infantry", count: 1},
        {name: "standard-artillery", count: 2},
        {name: "armored-artillery", count: 1},
        {name: "heavy-artillery", count: 1},
    ],
    boardConfig: [
        {name: "red-standard-hq", row: 0, column: 0},
        {name: "red-standard-artillery", row: 0, column: 1},
        {name: "red-standard-infantry", row: 1, column: 0},
        {name: "red-standard-infantry", row: 1, column: 1},
        {name: "red-standard-infantry", row: 1, column: 2},
        {name: "blue-standard-hq", row: 7, column: 7},
        {name: "blue-standard-artillery", row: 7, column: 6},
        {name: "blue-standard-infantry", row: 6, column: 7},
        {name: "blue-standard-infantry", row: 6, column: 6},
        {name: "blue-standard-infantry", row: 6, column: 5},
    ]
}