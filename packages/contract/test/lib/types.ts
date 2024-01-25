/* Types */
// TODO extract to ui workspace and import from ui package
export const TemplateType = {
  STANDARD: "Standard",
  LINEAR_VESTING: "LinearVesting",
} as const;
export type TemplateType = (typeof TemplateType)[keyof typeof TemplateType];
export type TemplateArgs = {
  [TemplateType.STANDARD]: [
    string,
    string,
    string,
    bigint,
    number,
    number,
    string
  ];
  [TemplateType.LINEAR_VESTING]: [
    string,
    string,
    string,
    number,
    bigint,
    number,
    number,
    string
  ];
};
export const TemplateArgs: { [key in TemplateType]: string[] } = {
  // owner_, merkleRoot_, token_, depositAmount_, nonce_, deadline_, signature_
  [TemplateType.STANDARD]: [
    "address",
    "bytes32",
    "address",
    "uint256",
    "uint256",
    "uint256",
    "bytes",
  ],
  // owner_, merkleRoot_, token_, vestingDuration_, depositAmount_, nonce_, deadline_, signature_
  [TemplateType.LINEAR_VESTING]: [
    "address",
    "bytes32",
    "address",
    "uint256",
    "uint256",
    "uint256",
    "uint256",
    "bytes",
  ],
};
