/**
 * Flags de "que se lee" (chat/gifts/joins/follows/likes/shares/username +
 * subs/cheers/raids/follows de Twitch). Los consumen el handler de WS
 * (decide si anuncia un evento) y la UI de toggles/config — por eso vive
 * en nucleo/ en vez de en una sola vista. Es un objeto mutable (no
 * `let` reasignado), asi que un solo `export const options` con
 * mutacion de propiedades es correcto y mas simple que getters/setters.
 */
export const options = {
  readChat: true,
  readGifts: false,
  readJoins: false,
  readFollows: false,
  readLikes: false,
  readShares: false,
  sayUsername: true,
  readTwitchSub: false,
  readTwitchCheer: false,
  readTwitchRaid: false,
  readTwitchFollow: false,
};
