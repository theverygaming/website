with import <nixpkgs> { };
stdenv.mkDerivation {
  name = "website";
  buildInputs = [
    jekyll
    rubyPackages.jekyll-feed
  ];
}
