# MerkleAirdropBase

## 概要

各エアドロップテンプレートのベースコントラクト。共通の変数、カスタムエラー、イベント、modifier を定義する。

### 変数

#### bool initialized

コントラクトが初期化されているかどうかの状態を保持する

#### address public immutable feePool

手数料を送金する FeePool コントラクトのアドレスを保持する

#### address public immutable factory

エアドロップを管理する Factory コントラクトのアドレスを保持する

#### address public owner

エアドロップ設置者のアドレスを保持する

#### bytes32 public merkleRoot

マークルルートを保持する

### 関数

#### コンストラクタ

```kotlin
constructor(address factory_, address feePool_)
```

| 引数名    | 型      | 概要                         | 制約 |
| --------- | ------- | ---------------------------- | ---- |
| factory\_ | address | Factory コントラクトアドレス | -    |
| feePool\_ | address | FeePool コントラクトアドレス | -    |

---

### modifier

#### onlyOwner

実行者をエアドロップ設置者に限定する

#### onlyDelegateFactory

実行を Factory からの delegatecall に限定する

#### onlyFactory

実行者を Factory に限定する
