// 网易百闻牌官方静态资源地址
const BASE = "https://ssr.res.netease.com/pc/zt/20191112204330/data";

/** 式神头像：shishen_avatar/{式神 id}.png */
export function shishenAvatarUrl(id: number | string) {
  return `${BASE}/shishen_avatar/${id}.png?15`;
}
