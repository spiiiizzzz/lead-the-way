export default class PriorityQueue {
    constructor() {
        this.items = []
    }

    add(obj, val) {
        // creating object from queue element
        let qElement = {
            obj: obj,
            val: val
        }
        let contain = false;

        // iterating through the entire
        // item array to add element at the
        // correct location of the Queue
        for (let i = 0; i < this.items.length; i++) {
            if (this.items[i].val > qElement.val) {
                // Once the correct location is found it is
                // enqueued
                this.items.splice(i, 0, qElement);
                contain = true;
                break;
            }
        }

        // if the element have the highest priority
        // it is added at the end of the queue
        if (!contain) {
            this.items.push(qElement);
        }

    }

    remove() {
        // return the dequeued element
        // and remove it.
        // if the queue is empty
        // returns Underflow
        if (this.isEmpty())
            throw new Error("Empty Queue")
        return this.items.shift();
    }

    min() {
        // returns the highest priority element
        // in the Priority queue without removing it.
        if (this.isEmpty())
            throw new Error("Empty Queue")
        return this.items[0].obj;
    }

    isEmpty() {
        // return true if the queue is empty.
        return this.items.length == 0;
    }

    // printQueue function
    // prints all the element of the queue
    printPQueue() {
        let str = "";
        for (let i = 0; i < this.items.length; i++)
            str += this.items[i].obj + " ";
        return str;
    }

}