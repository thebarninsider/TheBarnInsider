import {createContext,useContext,useEffect,useMemo,useState} from 'react';
import {supabase} from '../lib/supabase.js';
import {authApi,getProfile} from '../services/api.js';

const C=createContext(null);
export function AppProvider({children}){
  const [session,setSession]=useState(null),[profile,setProfile]=useState(null),[loading,setLoading]=useState(true);
  useEffect(()=>{
    let alive=true;
    const hydrate=async(s)=>{setSession(s);if(s?.user){try{const p=await getProfile(s.user.id);if(alive)setProfile(p)}catch(e){console.error(e);if(alive)setProfile(null)}}else setProfile(null);if(alive)setLoading(false)};
    supabase.auth.getSession().then(({data})=>hydrate(data.session));
    const {data:{subscription}}=supabase.auth.onAuthStateChange((_event,s)=>hydrate(s));
    return()=>{alive=false;subscription.unsubscribe()};
  },[]);
  const signup=async(d)=>authApi.signUp(d);
  const login=async(email,password)=>authApi.signIn({email,password});
  const logout=async()=>authApi.signOut();
  const refreshProfile=async()=>{if(session?.user){const p=await getProfile(session.user.id);setProfile(p);return p}};
  const v=useMemo(()=>({session,currentUser:session?.user||null,profile,loading,signup,login,logout,refreshProfile,isAdmin:['admin','moderator'].includes(profile?.role)}),[session,profile,loading]);
  return <C.Provider value={v}>{children}</C.Provider>
}
export const useApp=()=>useContext(C);
