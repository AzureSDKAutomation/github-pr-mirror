const main = async () => {
  const promise = new Promise<string>(resolve => resolve('hello'));
  console.log(await promise);
};

// tslint:disable-next-line: no-floating-promises
main();
