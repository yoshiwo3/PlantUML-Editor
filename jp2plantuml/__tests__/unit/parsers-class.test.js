/**
 * 単体テスト: クラス図パーサー
 * jp2plantuml/src/parsers/class.js のテスト
 */

const { parseClass } = require('../../src/parsers/class');

describe('parseClass', () => {
  describe('セミ構造化データのパース', () => {
    test('基本的なクラス定義を解析する', () => {
      const input = `クラス: User { id:int; name:string; email:string }
クラス: Order { id:int; userId:int }`;
      
      const result = parseClass(input);
      
      expect(result).toContain('@startuml');
      expect(result).toContain('@enduml');
      expect(result).toContain('class User {');
      expect(result).toContain('  id:int');
      expect(result).toContain('  name:string');
      expect(result).toContain('  email:string');
      expect(result).toContain('class Order {');
      expect(result).toContain('  id:int');
      expect(result).toContain('  userId:int');
    });

    test('プロパティなしのクラス定義を解析する', () => {
      const input = `クラス: SimpleClass
クラス: AnotherClass`;
      
      const result = parseClass(input);
      
      expect(result).toContain('class SimpleClass {');
      expect(result).toContain('class AnotherClass {');
    });

    test('クラス間の関連を解析する', () => {
      const input = `クラス: User
クラス: Order
関連: User -> Order : places
関連: Order --> User : belongs to`;
      
      const result = parseClass(input);
      
      expect(result).toContain('class User');
      expect(result).toContain('class Order');
      expect(result).toContain('User -> Order :  places');
      expect(result).toContain('Order --> User :  belongs to');
    });

    test('継承関係を解析する', () => {
      const input = `クラス: Animal
クラス: Dog
関連: Dog --|> Animal : extends`;
      
      const result = parseClass(input);
      
      expect(result).toContain('Dog --|> Animal :  extends');
    });

    test('複雑なクラス関係を解析する', () => {
      const input = `クラス: User { id:int; name:string; login():boolean }
クラス: Admin { permissions:array }
クラス: Order { id:int; amount:double }
関連: User -> Order : creates
関連: Admin --|> User : inherits`;
      
      const result = parseClass(input);
      
      expect(result).toContain('class User {');
      expect(result).toContain('  id:int');
      expect(result).toContain('  name:string');
      expect(result).toContain('  login():boolean');
      expect(result).toContain('class Admin {');
      expect(result).toContain('  permissions:array');
      expect(result).toContain('User -> Order :  creates');
      expect(result).toContain('Admin --|> User :  inherits');
    });
  });

  describe('フリーフォーム自然言語のパース', () => {
    test('自然な日本語からクラス関係を抽出する', () => {
      const input = `ユーザーは注文を作成する
管理者は権限を保持する`;
      
      const result = parseClass(input);
      
      expect(result).toContain('@startuml');
      expect(result).toContain('@enduml');
      expect(result).toContain('class ユーザー');
      expect(result).toContain('class 注文');
      expect(result).toContain('ユーザー --> 注文 : 作成');
      expect(result).toContain('class 管理者');
      expect(result).toContain('class 権限');
      expect(result).toContain('管理者 --> 権限 : 保持');
    });

    test('継承関係の自然言語を解析する', () => {
      const input = `犬は動物を継承する
猫は動物を継承する`;
      
      const result = parseClass(input);
      
      expect(result).toContain('class 犬');
      expect(result).toContain('class 動物');
      expect(result).toContain('犬 --|> 動物');
      expect(result).toContain('class 猫');
      expect(result).toContain('猫 --|> 動物');
    });

    test('様々な関係動詞を解析する', () => {
      const input = `顧客は商品を参照する
注文は商品を保持する
システムはログを作成する`;
      
      const result = parseClass(input);
      
      expect(result).toContain('顧客 --> 商品 : 参照');
      expect(result).toContain('注文 --> 商品 : 保持');
      expect(result).toContain('システム --> ログ : 作成');
    });
  });

  describe('モード指定テスト', () => {
    test('semi モードを強制指定できる', () => {
      const input = `クラス: TestClass { prop:string }
関連: TestClass -> Other`;
      
      const result = parseClass(input, 'semi');
      
      expect(result).toContain('class TestClass {');
      expect(result).toContain('  prop:string');
    });

    test('auto モードでセミ構造化を自動検出する', () => {
      const input = `クラス: AutoDetected
関連: AutoDetected -> Other`;
      
      const result = parseClass(input, 'auto');
      
      expect(result).toContain('class AutoDetected');
    });

    test('auto モードでフリーフォームを選択する', () => {
      const input = `システムはデータを管理する`;
      
      const result = parseClass(input, 'auto');
      
      expect(result).toContain('システム --> データ : 管理');
    });
  });

  describe('エラーハンドリング', () => {
    test('空文字列の入力を適切に処理する', () => {
      const result = parseClass('');
      
      expect(result).toContain('@startuml');
      expect(result).toContain('@enduml');
    });

    test('無効なフォーマットでも基本構造を保持する', () => {
      const input = `無効なクラス定義
関係のない文章`;
      
      const result = parseClass(input);
      
      expect(result).toContain('@startuml');
      expect(result).toContain('@enduml');
    });

    test('不正なクラス構文を適切に処理する', () => {
      const input = `クラス: 不正な構文 { prop without type }`;
      
      const result = parseClass(input);
      
      expect(result).toContain('class 不正な構文 {');
      expect(result).toContain('  prop without type');
    });
  });

  describe('複雑なシナリオテスト', () => {
    test('大規模なクラス階層を処理する', () => {
      const input = `クラス: Vehicle { speed:int; start():void }
クラス: Car { doors:int; honk():void }
クラス: Truck { capacity:double }
クラス: Motorcycle { engine:string }
関連: Car --|> Vehicle : extends
関連: Truck --|> Vehicle : extends  
関連: Motorcycle --|> Vehicle : extends
関連: Car -> Engine : has
関連: Truck -> Engine : has`;
      
      const result = parseClass(input);
      
      expect(result).toContain('class Vehicle {');
      expect(result).toContain('  speed:int');
      expect(result).toContain('  start():void');
      expect(result).toContain('class Car {');
      expect(result).toContain('  doors:int');
      expect(result).toContain('Car --|> Vehicle :  extends');
      expect(result).toContain('Truck --|> Vehicle :  extends');
      expect(result).toContain('Motorcycle --|> Vehicle :  extends');
    });

    test('混合形式（セミとフリー）の入力を処理する', () => {
      const input = `クラス: User { id:int }
システムはログを作成する
関連: User -> Log : generates`;
      
      const result = parseClass(input);
      
      // セミ構造化が優先される
      expect(result).toContain('class User {');
      expect(result).toContain('  id:int');
      expect(result).toContain('User -> Log :  generates');
    });
  });

  describe('PlantUML出力形式テスト', () => {
    test('正しいPlantUML構文を生成する', () => {
      const input = `クラス: TestClass`;
      
      const result = parseClass(input);
      
      const lines = result.split('\n');
      expect(lines[0]).toBe('@startuml');
      expect(lines[lines.length - 1]).toBe('@enduml');
    });

    test('プロパティの正しい構文形式', () => {
      const input = `クラス: TestClass { prop1:int; prop2:string }`;
      
      const result = parseClass(input);
      
      expect(result).toContain('class TestClass {');
      expect(result).toContain('  prop1:int');
      expect(result).toContain('  prop2:string');
      expect(result).toContain('}');
    });

    test('関連の正しい構文形式', () => {
      const input = `関連: ClassA -> ClassB : relationship`;
      
      const result = parseClass(input);
      
      expect(result).toContain('ClassA -> ClassB :  relationship');
    });
  });
});