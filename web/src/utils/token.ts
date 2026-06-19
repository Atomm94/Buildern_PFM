// Access token is held in memory only (lost on hard refresh — recovered via
// the refresh token). Refresh token is persisted in sessionStorage, which is
// scoped to a single browser tab. This keeps each tab an independent session,
// so e.g. a project owner in one tab and an invited user in another can be
// signed in at the same time as different accounts (localStorage, by contrast,
// is shared across all tabs and would let one login clobber the other).

let accessToken: string | null = null;

export const tokenStore = {
    getAccess: () => accessToken,
    setAccess: (t: string | null) => {
        accessToken = t;
    },
    getRefresh: () => sessionStorage.getItem("refreshToken"),
    setRefresh: (t: string | null) => {
        if (t) sessionStorage.setItem("refreshToken", t);
        else sessionStorage.removeItem("refreshToken");
    },
    clear: () => {
        accessToken = null;
        sessionStorage.removeItem("refreshToken");
    },
};
