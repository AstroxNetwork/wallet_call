export const idlFactory = ({ IDL }) => {
  const MethodType = IDL.Variant({
    CALL: IDL.Null,
    CompositeQuery: IDL.Null,
    QUERY: IDL.Null,
  });
  const Method = IDL.Record({
    name: IDL.Text,
    method_type: MethodType,
    key_operation: IDL.Bool,
  });
  const ProxyActorItem = IDL.Record({
    methods: IDL.Vec(IDL.Tuple(IDL.Text, Method)),
    canister: IDL.Principal,
  });
  const ProxyActorTargets = IDL.Record({
    targets: IDL.Vec(ProxyActorItem),
    expiration: IDL.Opt(IDL.Nat64),
  });
  const ExpiryUser = IDL.Record({
    user: IDL.Principal,
    expiry_timestamp: IDL.Nat64,
    timestamp: IDL.Nat64,
    target_list: IDL.Vec(ProxyActorItem),
  });
  const Result = IDL.Variant({ Ok: IDL.Nat, Err: IDL.Text });
  const Result_1 = IDL.Variant({ Ok: IDL.Null, Err: IDL.Text });
  const Result_2 = IDL.Variant({ Ok: IDL.Vec(IDL.Text), Err: IDL.Text });
  const CallResult = IDL.Record({ return: IDL.Vec(IDL.Nat8) });
  const Result_3 = IDL.Variant({ Ok: CallResult, Err: IDL.Text });
  const OwnerReply = IDL.Variant({
    Approved: Result_3,
    NotFound: IDL.Null,
    Rejected: IDL.Text,
  });
  const QueueHash = IDL.Record({
    hash: IDL.Text,
    user: IDL.Principal,
    time_stamp: IDL.Nat64,
  });
  const CallCanisterArgs = IDL.Record({
    args: IDL.Vec(IDL.Nat8),
    cycles: IDL.Nat,
    method_name: IDL.Text,
    canister: IDL.Principal,
  });
  const Result_4 = IDL.Variant({ Ok: IDL.Bool, Err: IDL.Text });
  return IDL.Service({
    add_expiry_user: IDL.Func([IDL.Principal, ProxyActorTargets], [ExpiryUser], []),
    add_proxy_black_list: IDL.Func([IDL.Principal], [IDL.Text], []),
    balance_get: IDL.Func([], [Result], ['query']),
    ego_canister_add: IDL.Func([IDL.Text, IDL.Principal], [Result_1], []),
    ego_controller_add: IDL.Func([IDL.Principal], [Result_1], []),
    ego_controller_remove: IDL.Func([IDL.Principal], [Result_1], []),
    ego_controller_set: IDL.Func([IDL.Vec(IDL.Principal)], [Result_1], []),
    ego_log_list: IDL.Func([IDL.Nat64], [Result_2], ['query']),
    ego_op_add: IDL.Func([IDL.Principal], [Result_1], []),
    ego_owner_add: IDL.Func([IDL.Principal], [Result_1], []),
    ego_owner_remove: IDL.Func([IDL.Principal], [Result_1], []),
    ego_owner_set: IDL.Func([IDL.Vec(IDL.Principal)], [Result_1], []),
    ego_user_add: IDL.Func([IDL.Principal], [Result_1], []),
    ego_user_remove: IDL.Func([IDL.Principal], [Result_1], []),
    ego_user_set: IDL.Func([IDL.Vec(IDL.Principal)], [Result_1], []),
    get_queue_reply: IDL.Func([IDL.Text], [IDL.Opt(OwnerReply)], ['query']),
    get_queue_unconfirmed: IDL.Func([IDL.Principal], [IDL.Vec(QueueHash)], ['query']),
    has_queue_method: IDL.Func([IDL.Text], [IDL.Bool], ['query']),
    is_proxy_black_list: IDL.Func([IDL.Principal], [IDL.Bool], ['query']),
    owner_confirm: IDL.Func([IDL.Text, IDL.Bool], [OwnerReply], []),
    proxy_call: IDL.Func([CallCanisterArgs], [Result_3], []),
    remove_proxy_black_list: IDL.Func([IDL.Principal], [IDL.Opt(IDL.Text)], []),
    remove_queue_method: IDL.Func([IDL.Text], [Result_4], []),
    set_expiry_period: IDL.Func([IDL.Nat64], [], []),
  });
};
export const init = ({ IDL }) => {
  return [];
};
