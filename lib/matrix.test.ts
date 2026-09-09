import test from 'node:test';
import assert from 'node:assert/strict';
import {scalar,parseMatrix,determinant,rank,IDENTITY,formatMatrix} from './matrix.ts';
test('safe arithmetic supports fractions, roots, signs, scientific notation and precedence',()=>{assert.equal(scalar('1/2'),.5);assert.equal(scalar('sqrt(4) + 2^3'),10);assert.equal(scalar('-2^2'),-4);assert.equal(scalar('1e-3'),.001);assert.equal(scalar('2^-2'),.25);});
test('invalid or nonfinite input is rejected',()=>{for(const value of ['', '1/0','sqrt(-1)','alert(1)','2foo','1+','10001','(1','2 3'])assert.throws(()=>scalar(value),value);});
test('all supported matrix formats parse consistently',()=>{for(const value of ['[1 0 0;0 1 0;0 0 1]','A = [[1,0,0],[0,1,0],[0,0,1]]','1\t0\t0\n0\t1\t0\n0\t0\t1',formatMatrix(IDENTITY)])assert.deepEqual(parseMatrix(value),IDENTITY);});
test('malformed dimensions rejected',()=>{assert.throws(()=>parseMatrix('[1 2;3 4]'));assert.throws(()=>parseMatrix('[1 0 0;0 1 0;0 0]'));});
test('determinant and rank distinguish orientation, projection and collapse',()=>{assert.equal(determinant(IDENTITY),1);assert.equal(rank(IDENTITY),3);assert.equal(determinant([[-1,0,0],[0,1,0],[0,0,1]]),-1);assert.equal(rank([[1,0,0],[0,1,0],[0,0,0]]),2);assert.equal(rank([[0,0,0],[0,0,0],[0,0,0]]),0);assert.equal(rank([[1,2,3],[2,4,6],[3,6,9]]),1);assert.equal(rank([[0,1,0],[1,0,0],[0,0,1]]),3);});
