// Simple Euler Particle Physics

var plask = require('plask');


var kEpsilon = Math.pow(2, -24);


function Particle1(){
    this.pos = 0;
    this.vel = 0;
}

Particle1.prototype = {

    spring: function(x, length, power){
        var xo  = x - this.pos;
        var mag = Math.abs(xo);
        if(mag > kEpsilon)
            this.vel += (xo / mag * (mag - length)) * power;
    },

    step: function(){
        this.pos += this.vel;
    }

};


function Particle2(){
    this.pos = new plask.Vec2(0, 0);
    this.vel = new plask.Vec2(0, 0);
}

Particle2.prototype = {

    spring: function(pos, length, power){
        var p = this.pos;
        var v = this.vel;
        var ox = pos.x - p.x;
        var oy = pos.y - p.y;
        var mag = Math.sqrt(ox * ox + oy * oy);
        if(mag > kEpsilon){
            power *= mag - length;
            v.x += ox / mag * power;
            v.y += oy / mag * power;
        }
    },

    step: function(){
        this.pos.add(this.vel);
    }

};

Particle2.getSpringForce = function(pos1, pos2, length){
    var ox = pos2.x - pos1.x;
    var oy = pos2.y - pos1.y;
    var mag = Math.sqrt(ox * ox + oy * oy);
    if(mag > kEpsilon){
        var power = mag - length;
        return new plask.Vec2(ox / mag * power, oy / mag * power);
    }
    return new plask.Vec2(0, 0);
}


function Particle3(){
    this.pos = new plask.Vec3(0, 0, 0);
    this.vel = new plask.Vec3(0, 0, 0);
}

Particle3.prototype = {

    spring: function(pos, length, power){
        var p = this.pos;
        var v = this.vel;
        var ox = pos.x - p.x;
        var oy = pos.y - p.y;
        var oz = pos.z - p.z;
        var mag = Math.sqrt(ox * ox + oy * oy + oz * oz);
        if(mag > kEpsilon){
            power *= mag - length;
            v.x += ox / mag * power;
            v.y += oy / mag * power;
            v.z += oz / mag * power;
        }
    },

    step: function(){
        this.pos.add(this.vel);
    }

};


exports.Particle1 = Particle1;
exports.Particle2 = Particle2;
exports.Particle3 = Particle3;