export const idlFactory = ({ IDL }) => {
  const TestArgs = IDL.Record({
    'map' : IDL.Vec(IDL.Tuple(IDL.Nat32, IDL.Bool)),
    'pid' : IDL.Principal,
    'str' : IDL.Text,
    'bytes' : IDL.Vec(IDL.Nat8),
  });
  return IDL.Service({
    'test_call' : IDL.Func([TestArgs], [IDL.Opt(IDL.Text)], []),
    'test_call_key' : IDL.Func([TestArgs], [IDL.Opt(IDL.Text)], []),
    'test_query' : IDL.Func([TestArgs], [IDL.Opt(IDL.Text)], ['query']),
  });
};
export const init = ({ IDL }) => { return []; };
