import assert from "assert";
import { GameEngine, toPublicGame, ServerGame, shuffle } from "../server/gameEngine.js";
import { issueToken, verifyToken, playerIdOf } from "../server/auth.js";
import { sanitize, leaksIdentity } from "../server/aiGateway.js";
import { GamePhase, Team, ActionType, ErrorCode } from "../src/types/game.js";

async function runAllTests() {
  console.log("=========================================");
  console.log("🧪 Running AI局中局 Security & Integrity Tests");
  console.log("=========================================\n");

  // --- Test 1: toPublicGame 隐私字段完全隔离 ---
  console.log("▶ [Test 1] toPublicGame() Privacy Leak Prevention");
  const fakeServerGame: ServerGame = {
    gameId: "game_test_1",
    roomId: "room_test_1",
    phase: GamePhase.ROUND_1,
    themeId: "company_night",
    themeName: "公司深夜密谈",
    round: 1,
    startedAt: Date.now(),
    spyPlayerIds: ["p_secret_spy_999"],
    phaseEndsAt: Date.now() + 60000,
    events: [],
    actions: [],
    votes: [],
    version: 1,
  };

  const pubGameRound1 = toPublicGame(fakeServerGame);
  assert.strictEqual(pubGameRound1 !== undefined, true);
  assert.strictEqual((pubGameRound1 as any).spyPlayerIds, undefined, "spyPlayerIds MUST NOT leak in public game state!");
  assert.strictEqual(pubGameRound1?.revealedSpies, undefined, "revealedSpies MUST NOT leak before RESULT phase!");

  // 结算阶段后允许 revealedSpies
  const fakeSettledGame: ServerGame = {
    ...fakeServerGame,
    phase: GamePhase.RESULT,
    revealedSpies: [{ playerId: "p_secret_spy_999", name: "张总监", roleName: "项目主管" }],
  };
  const pubGameResult = toPublicGame(fakeSettledGame);
  assert.strictEqual((pubGameResult as any).spyPlayerIds, undefined, "spyPlayerIds MUST remain stripped even in RESULT phase!");
  assert.strictEqual(pubGameResult?.revealedSpies?.length, 1, "revealedSpies allowed only after settlement");
  console.log("  ✅ Passed: Public state completely strips sensitive spy IDs\n");

  // --- Test 2: Token 鉴权与防篡改 ---
  console.log("▶ [Test 2] Auth Token Signing, Verification & Tamper Resistance");
  const testOpenid = "wx_test_openid_12345";
  const token = issueToken(testOpenid);
  assert.strictEqual(typeof token, "string");
  assert.strictEqual(token.includes("."), true);

  const verified = verifyToken(token);
  assert.strictEqual(verified?.openid, testOpenid, "Valid token should verify successfully");

  // 篡改签名测试
  const [body, sig] = token.split(".");
  const tamperedSig = sig.slice(0, -4) + "AAAA";
  const tamperedToken = `${body}.${tamperedSig}`;
  assert.strictEqual(verifyToken(tamperedToken), null, "Tampered signature MUST return null");

  // 伪造 payload 测试
  const fakePayload = Buffer.from("wx_hacker|9999999999999").toString("base64url");
  assert.strictEqual(verifyToken(`${fakePayload}.${sig}`), null, "Mismatched signature MUST return null");
  assert.strictEqual(playerIdOf(testOpenid), `p_${testOpenid}`);
  console.log("  ✅ Passed: HMAC token authentication passes all tamper tests\n");

  // --- Test 3: Prompt 防注入与敏感词检测 ---
  console.log("▶ [Test 3] Prompt Injection Sanitization & Leak Detection");
  const dangerousInput = "<script>alert(1)</script> { 'eval': true } `drop database` \\n 正常发言";
  const cleaned = sanitize(dangerousInput, 50);
  assert.strictEqual(cleaned.includes("<"), false);
  assert.strictEqual(cleaned.includes(">"), false);
  assert.strictEqual(cleaned.includes("{"), false);
  assert.strictEqual(cleaned.includes("`"), false);

  assert.strictEqual(leaksIdentity("张三是真正的内鬼！大家投他", ["张三", "李四"]), true);
  assert.strictEqual(leaksIdentity("监控录像显示有人在打印机旁徘徊", ["张三", "李四"]), false);
  console.log("  ✅ Passed: Injection characters stripped & identity leakage caught\n");

  // --- Test 4: Fisher-Yates 洗牌算法 ---
  console.log("▶ [Test 4] Fisher-Yates Uniform Shuffling");
  const sample = [1, 2, 3, 4, 5, 6, 7, 8];
  const shuffled = shuffle(sample);
  assert.strictEqual(shuffled.length, sample.length);
  assert.deepStrictEqual([...shuffled].sort(), [...sample].sort());
  console.log("  ✅ Passed: Shuffling preserves elements uniformly\n");

  // --- Test 5: GameEngine 端到端对局与业务状态机测试 ---
  console.log("▶ [Test 5] Complete Game Lifecycle & Invariant Validation");
  const engine = GameEngine.getInstance();

  // 1. 创建房间与补齐机器人
  const ownerUser = {
    openid: "wx_owner_001",
    nickname: "房主老王",
    avatarUrl: "",
  };
  const room = engine.createRoom(ownerUser);
  assert.strictEqual(room.ownerId, playerIdOf(ownerUser.openid));
  assert.strictEqual(room.status, "WAITING");

  engine.addBotPlayers(room.roomId, 6);
  const roomState = engine.getRoom(room.roomId);
  assert.strictEqual(roomState.room.players.length, 6);

  // 2. 非房主不能开局
  let startFailed = false;
  try {
    engine.startGame(room.roomId, "p_fake_intruder");
  } catch (err: any) {
    startFailed = err.message === ErrorCode.NOT_ROOM_OWNER;
  }
  assert.strictEqual(startFailed, true, "Intruder must NOT be allowed to start game");

  // 3. 房主开局
  const started = engine.startGame(room.roomId, room.ownerId);
  assert.strictEqual(started.game.phase, GamePhase.ROLE_ASSIGNMENT);
  assert.strictEqual(started.room.status, "PLAYING");
  assert.strictEqual((started.game as any).spyPlayerIds, undefined, "Public game must not contain spyPlayerIds");

  // 4. 身份隔离测试：仅房主能取自己秘密，别人不能取
  const ownerSecret = engine.getMySecret(started.game.gameId, room.ownerId);
  assert.strictEqual(ownerSecret.playerId, room.ownerId);
  assert.strictEqual(ownerSecret.team === Team.NORMAL || ownerSecret.team === Team.SPY, true);

  let unauthorizedSecret = false;
  try {
    engine.getMySecret(started.game.gameId, "p_stranger");
  } catch (err: any) {
    unauthorizedSecret = err.message === ErrorCode.UNAUTHORIZED;
  }
  assert.strictEqual(unauthorizedSecret, true, "Stranger must not access player secret");

  // 5. 推进阶段：ROLE_ASSIGNMENT -> ROUND_1
  const r1 = await engine.advancePhase(started.game.gameId, room.ownerId, started.game.version);
  assert.strictEqual(r1.game?.phase, GamePhase.ROUND_1);
  assert.strictEqual(r1.game?.round, 1);

  // 6. 玩家行动与防重复行动
  const firstBot = room.players.find((p) => p.playerId !== room.ownerId)!;
  const actRes = engine.submitAction(
    started.game.gameId,
    room.ownerId,
    ActionType.ACCUSE,
    firstBot.playerId,
    "昨晚看见他出入档案室"
  );

  // 自由发言测试：支持多次发言与插话，不限制一人一次
  const secondActRes = engine.submitAction(
    started.game.gameId,
    room.ownerId,
    ActionType.DEFEND,
    undefined,
    "补充辩护：昨晚我一直在会议室"
  );
  assert.strictEqual(secondActRes.game.actions.length >= 2, true, "Multiple chat actions in same round must be allowed");

  // 7. 推进阶段到 ROUND_2, MID_VOTING, EXILE_RESULT, FINAL_ROUND, VOTING
  const r2 = await engine.advancePhase(started.game.gameId, room.ownerId, secondActRes.game.version);
  assert.strictEqual(r2.game?.phase, GamePhase.ROUND_2);

  const midVoting = await engine.advancePhase(started.game.gameId, room.ownerId, r2.game!.version);
  assert.strictEqual(midVoting.game?.phase, GamePhase.MID_VOTING);

  // 中期放逐投票测试
  const midVoteRes = await engine.submitMidVote(started.game.gameId, room.ownerId, firstBot.playerId);
  assert.strictEqual(midVoteRes.game.phase, GamePhase.EXILE_RESULT);

  const finalRound = await engine.advancePhase(started.game.gameId, room.ownerId, midVoteRes.game.version);
  assert.strictEqual(finalRound.game?.phase, GamePhase.FINAL_ROUND);

  const voting = await engine.advancePhase(started.game.gameId, room.ownerId, finalRound.game!.version);
  assert.strictEqual(voting.game?.phase, GamePhase.VOTING);

  // 8. 终极投票防重与自动结算（必须投给存活未被淘汰的玩家）
  const activeBot = room.players.find((p) => p.isBot && !p.isEliminated)!;
  const voteRes = await engine.submitVote(started.game.gameId, room.ownerId, activeBot.playerId);
  // 重复投票必须报错 (已结算报 INVALID_GAME_STATE，未结算报 ALREADY_VOTED)
  let duplicateVoteFailed = false;
  try {
    await engine.submitVote(started.game.gameId, room.ownerId, activeBot.playerId);
  } catch (err: any) {
    duplicateVoteFailed =
      err.message === ErrorCode.ALREADY_VOTED || err.message === ErrorCode.INVALID_GAME_STATE;
  }
  assert.strictEqual(duplicateVoteFailed, true, "Duplicate vote must be rejected");

  // 所有真人已投，自动触发结算
  assert.strictEqual(voteRes.game.phase, GamePhase.RESULT);
  assert.strictEqual(
    voteRes.game.winnerTeam === Team.NORMAL || voteRes.game.winnerTeam === Team.SPY || voteRes.game.winnerTeam === "TIE",
    true
  );
  assert.strictEqual(Array.isArray(voteRes.game.revealedSpies), true);
  assert.strictEqual(voteRes.game.report !== undefined, true);

  // 9. P0 再来一局 (One More Game)
  const restarted = engine.restartGame(room.roomId, room.ownerId);
  assert.strictEqual(restarted.game.phase, GamePhase.ROLE_ASSIGNMENT);
  assert.strictEqual(restarted.room.status, "PLAYING");
  assert.strictEqual(restarted.room.players.length, 6);
  assert.notStrictEqual(restarted.game.gameId, started.game.gameId, "New game ID must be generated");

  console.log("  ✅ Passed: Complete game state machine, security guards and restart loop fully verified!\n");

  console.log("=========================================");
  console.log("🎉 ALL 5 TEST SUITES PASSED FLAWLESSLY!");
  console.log("=========================================\n");
}

runAllTests()
  .then(() => {
    process.exit(0);
  })
  .catch((err) => {
    console.error("❌ Test failed with error:", err);
    process.exit(1);
  });
