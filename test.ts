import _ from 'lodash';
function PassbyReference(obj, aa: string) {
  let tmp = obj.a;
  obj.a = obj.b;
  obj.b = tmp;

  console.log(`Inside Pass By Reference
        Function -> a = ${obj.a} b = ${obj.b}`);
}

console.log(PassbyReference);
