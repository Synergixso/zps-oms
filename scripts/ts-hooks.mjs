// Resolve hook for `node --experimental-strip-types`: lets scripts import application modules that use
// extension-less relative specifiers (as the Next.js code does) by trying `<specifier>.ts`. No dependency.
export async function resolve(specifier, context, next) {
  try {
    return await next(specifier, context);
  } catch (e) {
    if ((specifier.startsWith(".") || specifier.startsWith("/")) && !/\.[cm]?[jt]s$/.test(specifier)) return next(`${specifier}.ts`, context);
    throw e;
  }
}
