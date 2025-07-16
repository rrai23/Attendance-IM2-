// Test DirectFlow initialization
async function testDirectFlowInit() {
    console.log('🧪 Testing DirectFlow initialization...');
    
    // Wait for page to load
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    console.log('🔍 Checking DirectFlow availability...');
    console.log('window.directFlow:', typeof window.directFlow);
    console.log('window.DirectFlow:', typeof window.DirectFlow);
    console.log('window.directFlowAuth:', typeof window.directFlowAuth);
    
    if (window.directFlow) {
        console.log('DirectFlow initialized:', window.directFlow.initialized);
        console.log('DirectFlow isAuthenticated:', window.directFlow.isAuthenticated());
        console.log('DirectFlow current user:', window.directFlow.getCurrentUser());
        
        // Try to test connection
        try {
            await window.directFlow.testConnection();
            console.log('✅ DirectFlow connection test passed');
        } catch (error) {
            console.error('❌ DirectFlow connection test failed:', error);
        }
    } else {
        console.error('❌ DirectFlow not found');
    }
    
    // Check Global System Sync
    if (window.GlobalSystemSync) {
        console.log('✅ Global System Sync found');
    } else {
        console.error('❌ Global System Sync not found');
    }
}

// Run test
testDirectFlowInit();
