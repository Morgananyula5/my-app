public static void main(string[] args)
{
    countdown(10);
}

public static int countdown(int n) {


        if (n == 0) {
        return n;
    }
    else
    {
        System.out.println(n);
        return countdown(n-1);
        
}
}