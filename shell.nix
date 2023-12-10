with import <nixpkgs> { };
let
in stdenv.mkDerivation {
  name = "website";
  buildInputs =
    let
    in
    [
      rsync
      python311Packages.mako
      caddy
    ];
}
