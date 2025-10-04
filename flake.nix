{
  description = "website";

  inputs = {
    # nixpkgs.url = "nixpkgs/nixpkgs-unstable";
    # we use old nixpkgs because https://talk.jekyllrb.com/t/liquid-4-0-3-tainted/7946/5 ...that happens in current latest
    nixpkgs.url = "github:NixOS/nixpkgs/0fdd249854c73495ce0fde5e7ff50929a9411003";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs = { self, nixpkgs, flake-utils }: { } // flake-utils.lib.eachDefaultSystem (system:
    let
      pkgs = import nixpkgs {
        inherit system;
      };
    in
    {
      devShells.default = pkgs.stdenv.mkDerivation {
        name = "website";
        buildInputs = with pkgs; [
          jekyll
          rubyPackages.jekyll-feed
        ];
      };
    });
}
