var plask = require("plask");

var Vec2 = plask.Vec2;


function Rect2(){
    this.min = new Vec2(0, 0);
    this.max = new Vec2(0, 0);
    this.set.apply(this, arguments);
}

Rect2.prototype = {

    contains: function(v){
        return (v.x >= this.min.x) && (v.x <= this.max.x) &&
               (v.y >= this.min.y) && (v.y <= this.max.y);
    },

    set: function(a, b, c, d){
        if(arguments.length === 1){ // minmax
            this.min = new Vec2(a.x, a.y);
            this.max = new Vec2(a.x, a.y);
        }
        else if(arguments.length === 2){ // min, max
            this.min = new Vec2(a.x, a.y);
            this.max = new Vec2(b.x, b.y);
        }
        else if(arguments.length === 4){ // x1, y1, x2, y2
            this.min = new Vec2(a, b);
            this.max = new Vec2(c, d);
        }
        return this;
    },

    enclose: function(x, y){
        var min = this.min, max = this.max;
             if(x < min.x) min.x = x;
        else if(x > max.x) max.x = x;
             if(y < min.y) min.y = y;
        else if(y > max.y) max.y = y;
        return this;
    },

    encloseVec2: function(v){
        return this.enclose(v.x, v.y);
    },

    canonicalize: function(){
        var tmp, min = this.min, max = this.max;
        if(min.x > max.x){
            tmp = min.x;
            min.x = max.x;
            max.x = tmp;
        }
        if(min.y > max.y){
            tmp = min.y;
            min.y = max.y;
            max.y = tmp;
        }
        return this;
    },

    getCenter: function(){
        return min.lerped(max, 0.5);
    }

};

exports.Rect2 = Rect2;
