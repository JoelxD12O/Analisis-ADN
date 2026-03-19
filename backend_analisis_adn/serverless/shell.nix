{ pkgs ? import <nixpkgs> {} }:

let
  python = pkgs.python313.withPackages (ps: with ps; [
    boto3
  ]);
in
pkgs.mkShell {
  packages = [
    python
    pkgs.awscli2
  ];

  shellHook = ''
    echo "Entorno serverless listo: python=$(python --version 2>&1)"
    echo "boto3 y awscli2 disponibles."
  '';
}
