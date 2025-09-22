#!/bin/bash

# Set these variables before running
PRIVATE_KEY="your_testnet_private_key_here"
CONTRACT_NAME="cholo"
CONTRACT_PATH="../cholo.clar"

# Deploy to Stacks testnet
stacks-cli publish $CONTRACT_PATH \
  --testnet \
  --private-key $PRIVATE_KEY \
  --contract-name $CONTRACT_NAME