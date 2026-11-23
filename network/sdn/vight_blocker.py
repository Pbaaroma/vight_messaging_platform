"""SDN controller

The Controller adds/removes high-priority DROP rules for blocked IPs
Block list is managed at runtime over a small REST API (port 8080)


"""
import ipaddress
import json

from ryu.app.wsgi import ControllerBase, Response, WSGIApplication, route
from ryu.base import app_manager
from ryu.controller import ofp_event
from ryu.controller.handler import CONFIG_DISPATCHER, set_ev_cls
from ryu.ofproto import ofproto_v1_3


APP_NAME = "vight_blocker"
BLOCK_PRIORITY = 200
ETH_TYPE_IP = 0x0800

class VightBlocker(app_manager.RyuApp):
    # Tell Ryu we speak OpenFlow 1.3 (must match the switches: topo files use
    # protocols="OpenFlow13").
    OFP_VERSIONS = [ofproto_v1_3.OFP_VERSION]

    # Ask Ryu to start its built-in web server and pass it to us as kwargs["wsgi"].
    _CONTEXTS = {"wsgi": WSGIApplication}

    def __init__(self, *args, **kwargs):
        
        super().__init__(*args, **kwargs)

        # Every switch that has connected: {datapath_id: switch_object}.
        # Ryu calls a switch a "datapath". We keep them so block() can send
        # a rule to ALL switches (s1 and s2 in topo_nfv.py).
        self.datapaths = {}

        # The set of blocked source IPs, kept in memory only. If you restart
        # Ryu this is empty again (see "limitations" in your report).
        self.blocked = set()

        # Attach the REST API (class BlockApi below) to Ryu's web server and
        # give it a reference to this controller so it can call block()/unblock().
        kwargs["wsgi"].register(BlockApi, {APP_NAME: self})

    # ---- switch connects: default "act like a normal switch" + replay blocks
    @set_ev_cls(ofp_event.EventOFPSwitchFeatures, CONFIG_DISPATCHER)
    def on_switch_features(self, ev):
        dp = ev.msg.datapath
        self.datapaths[dp.id] = dp
        ofp, parser = dp.ofproto, dp.ofproto_parser


        #rule 1: act like a normal switch
        actions = [parser.OFPActionOutput(ofp.OFPP_NORMAL)]
        inst = [parser.OFPInstructionActions(ofp.OFPIT_APPLY_ACTIONS, actions)]

        # OFPMatch() with no arguments = match every packet.
        self._flow_mod(dp, ofp.OFPFC_ADD, 0, parser.OFPMatch(), inst)

        for ip in self.blocked:
            self._drop_rule(dp, ofp.OFPFC_ADD, ip)

        self.logger.info("switch %s connected", dp.id)

    # ---- helpers
    def _flow_mod(self, dp, command, priority, match, instructions):
        ofp, parser = dp.ofproto, dp.ofproto_parser
        dp.send_msg(parser.OFPFlowMod(
            datapath=dp, command=command, priority=priority, match=match,
            instructions=instructions,
            out_port=ofp.OFPP_ANY, out_group=ofp.OFPG_ANY))

    def _drop_rule(self, dp, command, ip):
        match = dp.ofproto_parser.OFPMatch(eth_type=ETH_TYPE_IP, ipv4_src=ip)
        # No instructions == drop
        self._flow_mod(dp, command, BLOCK_PRIORITY, match, [])

    # ---- called by the REST API
    def block(self, ip):
        self.blocked.add(ip)
        for dp in self.datapaths.values():
            self._drop_rule(dp, dp.ofproto.OFPFC_ADD, ip)
        self.logger.info("BLOCKED %s", ip)

    def unblock(self, ip):
        self.blocked.discard(ip)
        for dp in self.datapaths.values():
            self._drop_rule(dp, dp.ofproto.OFPFC_DELETE_STRICT, ip)
        self.logger.info("UNBLOCKED %s", ip)


class BlockApi(ControllerBase):
    def __init__(self, req, link, data, **config):
        super().__init__(req, link, data, **config)
        self.app = data[APP_NAME]

    @staticmethod
    def _json(obj, status=200):
        return Response(status=status, content_type="application/json",
                        body=json.dumps(obj).encode("utf-8"))

    # GET /blocklist  -> {"blocked": ["10.0.1.1", ...]}
    @route("blocklist", "/blocklist", methods=["GET"])
    def list_blocked(self, req, **kwargs):
        return self._json({"blocked": sorted(self.app.blocked)})


    # PUT /block/<ip>  -> block that IP
    # (the first argument to @route is just a unique name for the route)
    @route("block_add", "/block/{ip}", methods=["PUT"])
    def add(self, req, ip, **kwargs):
        try:
            ip = str(ipaddress.IPv4Address(ip))
        except ValueError:
            return self._json({"error": "invalid IPv4 address"}, 400)
        self.app.block(ip)
        return self._json({"blocked": sorted(self.app.blocked)})

    # DELETE /block/<ip>  -> unblock that IP
    @route("block_del", "/block/{ip}", methods=["DELETE"])
    def remove(self, req, ip, **kwargs):
        try:
            ip = str(ipaddress.IPv4Address(ip))
        except ValueError:
            return self._json({"error": "invalid IPv4 address"}, 400)
        self.app.unblock(ip)
        return self._json({"blocked": sorted(self.app.blocked)})