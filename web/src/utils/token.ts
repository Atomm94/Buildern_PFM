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
