# アクター

- エアドロップ
  - エアドロップ情報を保持する
  - クレーム済情報を保持する
  - 設置手数料をフィープールに送る
  - プラットフォーム手数料をフィープールに送る
  - クレーム手数料を保持する
  - 転送関数を保持する
- エアドロップ設置者
  - トークンを回収する
  - トークンをデポジットする
  - クレーム手数料を回収する
- クレーマー
  - クレームする
- ファクトリー
  - 転送関数を呼び出す
- ユーザ
  - エアドロップ情報を取得する

## ユースケース図

```mermaid
graph LR
    sow{{エアドロップ設置者}}
    spa{{クレーマー}}
    f{{ファクトリー}}
    u{{ユーザ}}

    S1[エアドロップ情報を保持する]
    S2[クレーム済情報を保持する]
    S3[設置手数料をフィープールに送る]
    S4[プラットフォーム手数料をフィープールに送る]
    S5[クレーム手数料を保持する]

    sow-->SOW1[トークンを回収する]
    sow-->SOW2[トークンをデポジットする]
    sow-->SOW3[クレーム手数料を回収する]

    spa-->SPA1[クレームする]

    u-->U1[エアドロップ情報を取得する]

    f-->F1[転送関数を呼び出す]

    subgraph エアドロップ
        S1
        S2
        S3
        S4
        S5
        SPA1
        F1
        U1
        SOW1
        SOW3
    end
```