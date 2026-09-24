import assert from "node:assert/strict";
import test from "node:test";
import { Interface, encodeBytes32String } from "ethers";
import { decodeVotedLog, ge6VotedTopic, resolveVoteTarget } from "../src/blockscout-ge6-indexer.js";

const iface = new Interface([
  "event Voted(address indexed _voter, uint256 indexed _index, uint256 _amount, bytes32 _hash)",
]);

test("decodes TokenX ElectionPoll Voted logs", () => {
  const encoded = iface.encodeEventLog(iface.getEvent("Voted")!, [
    "0x1234567890123456789012345678901234567890", 42n, 1000n * 10n ** 18n, encodeBytes32String("Sita"),
  ]);
  const vote = decodeVotedLog({
    block_number: 49_475_830, data: encoded.data, index: 7, topics: encoded.topics,
    transaction_hash: "0xabc",
  });
  assert.equal(encoded.topics[0]?.toLowerCase(), ge6VotedTopic);
  assert.deepEqual(vote, {
    voterAddress: "0x1234567890123456789012345678901234567890",
    voteIndex: "42", amountRaw: "1000000000000000000000", targetKey: encodeBytes32String("Sita").toLowerCase(),
  });
});

test("resolves configured hashes and readable bytes32 member names", () => {
  const opaque = `0x${"ab".repeat(32)}`;
  assert.equal(resolveVoteTarget(opaque, new Map([[opaque, "Sita"]])), "Sita");
  assert.equal(resolveVoteTarget(encodeBytes32String("Nammonn"), new Map()), "Nammonn");
});

test("ignores non-Voted logs", () => {
  assert.equal(decodeVotedLog({
    block_number: 1, data: "0x", index: 0, topics: [`0x${"00".repeat(32)}`], transaction_hash: "0xabc",
  }), undefined);
});
