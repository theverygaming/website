{
  description = "website";

  inputs = {
    # nixpkgs.url = "nixpkgs/nixpkgs-unstable";
    # we use old nixpkgs because https://talk.jekyllrb.com/t/liquid-4-0-3-tainted/7946/5 ...that happens in current latest
    nixpkgs.url = "github:NixOS/nixpkgs/0fdd249854c73495ce0fde5e7ff50929a9411003";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs =
    {
      self,
      nixpkgs,
      flake-utils,
    }:
    { }
    // flake-utils.lib.eachDefaultSystem (
      system:
      let
        pkgs = import nixpkgs {
          inherit system;
        };
      in
      rec {
        packages.theverygaming-website = pkgs.stdenvNoCC.mkDerivation rec {
          name = "website";

          src = self;

          nativeBuildInputs = with pkgs; [
            jekyll
            rubyPackages.jekyll-feed
          ];

          buildPhase = ''
            cat << EOF > _data/buildinfo.yml
            nix_store_path: "$out"
            commit: "${if builtins.hasAttr "rev" self then self.rev else self.dirtyRev}"
            EOF
            jekyll build
          '';

          installPhase = ''
            cp -r _site $out
          '';
        };
        devShells.default = pkgs.stdenv.mkDerivation {
          name = "website";
          buildInputs = packages.theverygaming-website.nativeBuildInputs;
        };
      }
    );
}
