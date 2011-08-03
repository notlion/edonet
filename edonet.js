var plask    = require("plask");
var particle = require("./particle");
var rect     = require("./rect");

var lerp      = plask.lerp;
var Vec2      = plask.Vec2;
var Rect2     = rect.Rect2;
var Particle2 = particle.Particle2;

exports.create = function(){

    function createLocalLink(node1, node2, shared_link){
        if(!node1.isLinked(node2)){
            node1.links[node2.id] = {
                node:   node2,
                shared: shared_link
            };
            node1.num_links++;
        }
    }
    function deleteLocalLink(node1, node2){
        if(node2.id in node1.links){
            delete node1.links[node2.id];
            node1.num_links--;
        }
    }
    function createSharedLink(node1, node2, length, power){
        if(node1 !== node2 && node1.num_links < node1.max_links && node2.num_links < node2.max_links){
            var link = {
                node1:  node1,
                node2:  node2,
                length: length,
                power:  power,
                hard:   false,
                bounds: new Rect2(node1.pos, node2.pos).canonicalize()
            };
            _links.push(link);
            createLocalLink(node1, node2, link);
            createLocalLink(node2, node1, link);
            return link;
        }
    }
    function deleteSharedLink(link){
        var idx = _links.indexOf(link);
        if(idx >= 0){
            _links.splice(idx, 1);
            deleteLocalLink(link.node1, link.node2);
            deleteLocalLink(link.node2, link.node1);
        }
    }
    function splitSharedLink(link, n){
        if(n > 0){
            deleteSharedLink(link);
            var ln1 = link.node1, ln2 = link.node2;
            var node, last_node = ln1;
            var n1 = n + 1, len = link.length / n1;
            for(var t, i = 0; i < n; ++i){
                t = (i + 1) / n1;
                node = createNode(ln1.pos.lerped(ln2.pos, t), lerp(ln1.radius, ln2.radius, t));
                createSharedLink(last_node, node, len, link.power);
                last_node = node;
            }
            createSharedLink(last_node, ln2, len, link.power);
        }
    }
    function cutSharedLink(link, p1, p2, min_seg_length, merge_nodes){
        var ln1p = link.node1.pos;
        var ln2p = link.node2.pos;
        var pnt = intersectLineLine(p1, p2, ln1p, ln2p);
        if(pnt){
            var msl2 = min_seg_length !== undefined ? min_seg_length * min_seg_length : 0;

            if(pnt.distSquared(ln1p) <= msl2){
                if(!merge_nodes)
                    return cutNode(link.node1);
            }
            else if(pnt.distSquared(ln2p) <= msl2){
                if(!merge_nodes)
                    return cutNode(link.node2);
            }
            else{
                deleteSharedLink(link);

                var nodes = [];

                var ln1 = link.node1, ln2 = link.node2;
                var d1p = ln1.pos.dist(pnt);
                var d12 = ln1.pos.dist(ln2.pos);
                var t = d1p / d12;
                var r = lerp(ln1.radius, ln2.radius, t);

                var node1 = createNode(pnt, r);
                var node2 = node1;

                nodes.push(node1);

                if(!merge_nodes){
                    node2 = createNode(pnt, r);
                    nodes.push(node2);
                }

                createSharedLink(link.node1, node1, link.length * t, link.power);
                createSharedLink(link.node2, node2, link.length * (1 - t), link.power);

                return nodes;
            }
        }
    }


    function createNode(pos, radius){
        var node = new Node(pos.x, pos.y, radius);
        _nodes.push(node);
        return node;
    }
    function deleteNode(node){
        var idx = _nodes.indexOf(node);
        if(idx >= 0){
            _nodes.splice(idx, 1);
            for(var id in node.links){
                deleteSharedLink(node.links[id].shared);
            }
        }
    }
    function cutNode(node){
        var link, new_node, nodes = [];
        for(var id in node.links){
            link = node.links[id];
            new_node = createNode(node.pos, node.radius);
            createSharedLink(new_node, link.node, link.shared.length, link.shared.power);
            nodes.push(new_node);
        }
        deleteNode(node);
        return nodes;
    }


    function updateChains(){
        _chains = [];
        var i, node;
        for(i = _nodes.length; --i >= 0;){
            node = _nodes[i];
            if(node.num_links > 0 && node.num_links != 2){
                // Append Chain starting with this node
                for(var id in node.links){
                    var next_link = node.links[id];
                    if(!next_link.shared.used){
                        next_link.shared.used = true;

                        var chain = [];
                        var prev_node = node;
                        var next_node = next_link.node;

                        chain.push(prev_node.pos);
                        while(next_node.num_links == 2 && !next_node.hard){
                            chain.push(next_node.pos);
                            for(var id2 in next_node.links){
                                if(next_node.links[id2].node !== prev_node){
                                    next_link = next_node.links[id2];
                                    break;
                                }
                            }
                            next_link.shared.used = true;
                            prev_node = next_node;
                            next_node = next_link.node;
                        }
                        chain.push(next_node.pos);

                        _chains.push(chain);
                    }
                }
            }
        }
        for(i = _links.length; --i >= 0;){
            delete _links[i].used;
        }
    }


    function Node(x, y, radius){
        particle.Particle2.call(this);
        this.pos.set(x, y);

        this.id = _node_next_id++;
        this.radius = radius;

        this.links = {};
        this.num_links = 0;
        this.max_links = Number.MAX_VALUE;
    }
    Node.prototype = new particle.Particle2();
    Node.prototype.link = function(node, length, power){
        return createSharedLink(this, node, length, power);
    };
    Node.prototype.unlink = function(node){
        return deleteSharedLink(this.links[node].shared);
    };
    Node.prototype.isLinked = function(node){
        return node.id in this.links;
    };
    Node.prototype.velocityStep = function(node){
        // Spring against linked nodes
        var ln1, ln1node, ln1len, ln1edge, ln2, norm1, norm2, force;
        for(var id1 in this.links){
            ln1 = this.links[id1];
            ln1node = ln1.node;

            this.spring(ln1node.pos, ln1.shared.length, ln1.shared.power);

            ln1len = ln1node.pos.dist(this.pos);
            ln1edge = regPolyEdgeLen(ln1node.num_links);
            var num_affectors = 0;
            var force = new Vec2(0, 0);
            for(var id2 in ln1node.links){
                if(id2 !== this.id){
                    ln2 = ln1node.links[id2];
                    norm1 = ln1node.links[this.id].normal;
                    norm2 = ln2.normal;
                    if(norm1.distSquared(norm2) < ln1edge * ln1edge){
                        force.add(Particle2.getSpringForce(norm1, norm2, ln1edge).scale(ln1len));
                        num_affectors += 1;
                    }
                }
            }
            this.vel.add(force.scale((1 / num_affectors) * _globals.stiffness));
        }
    };
    Node.prototype.avoidLinks = function(){
        var link, t, p1, p2, avoid_pos, avoid_radius, avoid_dist;
        for(var i = _links.length; --i >= 0;){
            link = _links[i];
            if(!(link.node1.id in this.links || link.node2.id in this.links)){
                p1 = link.node1.pos;
                p2 = link.node2.pos;
                t = plask.clamp(nearestPointOnLine(this.pos, p1, p2), 0, 1);
                avoid_pos    = p1.lerped(p2, t);
                avoid_radius = plask.lerp(link.node1.radius, link.node2.radius, t);
                avoid_dist   = this.radius + avoid_radius;
                if(this.pos.distSquared(avoid_pos) < avoid_dist * avoid_dist)
                    this.spring(avoid_pos, avoid_dist, avoid_radius / this.radius * _globals.avoidance);
            }
        }
    };
    Node.prototype.calcLinkNormals = function(){
        var link;
        for(var id in this.links){
            link = this.links[id];
            link.normal = link.node.pos.subbed(this.pos).normalize();
        }
    };
    Node.prototype.draw = function(canvas, paint){
        canvas.drawCircle(paint, this.pos.x, this.pos.y, this.radius / 5);
    };


    var _node_next_id = 0;

    var _nodes  = [];
    var _links  = [];
    var _chains = [];

    var _globals = {
        avoidance: 0.025,
        stiffness: 0.1,
        damping:   0.75
    };

    return {
        step: function(){
            var i, nl = _nodes.length;
            for(i = nl; --i >= 0;){
                _nodes[i].calcLinkNormals();
            }
            for(i = nl; --i >= 0;){
                _nodes[i].vel.scale(_globals.damping);
                _nodes[i].velocityStep();
            }
            for(i = nl; --i >= 0;){
                _nodes[i].step();
            }
            updateChains();
        },
        drawChains: function(canvas, paint){
            var path = new plask.SkPath();
            for(var chain, i = _chains.length; --i >= 0;){
                chain = _chains[i];
                path.moveTo(chain[0].x, chain[0].y);
                if(chain.length == 2)
                    path.lineTo(chain[1].x, chain[1].y);
                else if(chain.length == 3)
                    path.quadTo(chain[1].x, chain[1].y, chain[2].x, chain[2].y)
                else
                    splineTo(path, chain);
            }
            canvas.drawPath(paint, path);
        },
        drawNodes: function(canvas, paint, show_chain_nodes){
            for(var i = _nodes.length; --i >= 0;){
                if(show_chain_nodes || _nodes[i].num_links !== 2)
                    _nodes[i].draw(canvas, paint);
            }
        },
        forEachNode: function(callback){
            for(var i = _nodes.length; --i >= 0;)
                callback(_nodes[i]);
        },
        forEachLink: function(callback){
            for(var i = _links.length; --i >= 0;)
                callback(_links[i]);
        },
        createNode: createNode,
        deleteNode: deleteNode,
        cutNode:    cutNode,
        deleteLink: deleteSharedLink,
        splitLink:  splitSharedLink,
        cutLink:    cutSharedLink,
        nodes:   _nodes,
        links:   _links,
        globals: _globals
    };

};


// Utils

function regPolyEdgeLen(num_sides){
    return Math.sin(Math.PI / num_sides) * 2;
}

function splineTo(path, points){
    var nv = points.length;
    if(nv >= 3){
        var p0, p1, p2;
        for(var i = 1, n = nv - 1; i <= n; i++){
            p0 = points[i - 1];
            p1 = points[i];
            if(i == n){  // finish him
                path.cubicTo(
                    (2 * p0.x + p1.x) / 3, (2 * p0.y + p1.y) / 3,
                    (2 * p1.x + p0.x) / 3, (2 * p1.y + p0.y) / 3,
                    p1.x, p1.y
                );
            }
            else{
                p2 = points[i + 1];
                path.cubicTo(
                    (2 * p0.x + p1.x) / 3, (2 * p0.y + p1.y) / 3,
                    (2 * p1.x + p0.x) / 3, (2 * p1.y + p0.y) / 3,
                    (p0.x + 4 * p1.x + p2.x) / 6, (p0.y + 4 * p1.y + p2.y) / 6
                );
            }
        }
    }
}

function intersectLineLine(a1, a2, b1, b2){
    var ua_t = (b2.x - b1.x) * (a1.y - b1.y) - (b2.y - b1.y) * (a1.x - b1.x);
    var ub_t = (a2.x - a1.x) * (a1.y - b1.y) - (a2.y - a1.y) * (a1.x - b1.x);
    var u_b  = (b2.y - b1.y) * (a2.x - a1.x) - (b2.x - b1.x) * (a2.y - a1.y);
    if(u_b != 0){
        var ua = ua_t / u_b;
        var ub = ub_t / u_b;
        if(0 <= ua && ua <= 1 && 0 <= ub && ub <= 1){
            return new Vec2(
                a1.x + ua * (a2.x - a1.x),
                a1.y + ua * (a2.y - a1.y)
            );
        }
    }
    return null;
}

function nearestPointOnLine(pos, p1, p2){
    var ox = p2.x - p1.x;
    var oy = p2.y - p1.y;

    if(ox === 0 && oy === 0)
        return pos.dist(p1);

    return ((pos.x - p1.x) * ox + (pos.y - p1.y) * oy) / (ox * ox + oy * oy);
}
