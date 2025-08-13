## 開発コマンド（外出し）

### Docker
```bash
cd jp2plantuml
docker-compose build
docker-compose up -d
docker-compose logs -f
docker-compose down
```

### ローカル
```bash
cd jp2plantuml
npm install
npm start   # or: npm run dev
```

### パッケージ
```bash
npm install <package>
docker-compose build
```



